/**
 * Realtime 모드용 — OpenAI gpt-realtime 세션 생성 + ephemeral client_secret 발급.
 *
 *   POST /api/realtime/session  body: { sessionId }
 *
 * 클라이언트는 응답의 client_secret으로 WebRTC peer connection을 직접 OpenAI에 맺는다.
 * 우리 서버는 토큰 발급과 시스템 프롬프트/tool 정의만 담당 (오디오 릴레이 X).
 *
 * 시스템 프롬프트는 buildSystemPromptBlocks의 텍스트를 합쳐서 instructions로 박음.
 * Claude Opus가 추후 백그라운드 코치(/api/conversation/coach)로 동적 가이드를 추가 주입.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { isOpenAIConfigured } from '@/lib/conversation/openai';
import { buildSystemPromptBlocks } from '@/lib/conversation/system-prompt';
import { fetchSessionContext } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OpenAI Realtime — 한국어 회상치료에 가장 자연스러운 voice. 코멘트로 흔적 남김.
const REALTIME_MODEL = 'gpt-realtime';
const REALTIME_VOICE = 'coral';

// VAD 침묵 길이 — 어르신 호흡 길이 반영 (기존 클라이언트 VAD와 동일 정책).
const VAD_SILENCE_MS = 1200;

// Realtime이 호출 가능한 tool들. 클라이언트가 function_call 이벤트를 받아서
// /api/conversation/tool로 위임하고 결과를 Realtime에 다시 보낸다.
const TOOLS = [
  {
    type: 'function',
    name: 'mark_treasure',
    description:
      '어르신의 보물 같은 회상(예: "아직도 떠올라요", "보고 싶어요" 같은 깊은 정서가 묻은 기억)을 발견했을 때 호출. 이 기억을 메모해 추출 단계에 반영하기 위함.',
    parameters: {
      type: 'object',
      properties: {
        excerpt: { type: 'string', description: '어르신 발화 중 보물 부분 원문' },
        context: { type: 'string', description: '어떤 주제·인물에 대한 회상인지 한 문장' },
      },
      required: ['excerpt'],
    },
  },
  {
    type: 'function',
    name: 'flag_taboo_breach',
    description:
      '회피 주제(시스템 프롬프트에 명시된 taboo)에 어르신이 혹은 본인 응답이 닿았을 때 호출. 이후 다른 주제로 전환 의도를 표명.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '닿은 회피 주제' },
        speaker: { type: 'string', enum: ['ai', 'elderly'], description: '누가 언급했는지' },
      },
      required: ['topic', 'speaker'],
    },
  },
  {
    type: 'function',
    name: 'request_wrapup',
    description:
      '대화가 자연스럽게 마무리로 향할 때(어르신이 피곤해 보이거나 충분히 회상하셨을 때) 호출. 백엔드가 wrapup 가이드를 다시 주입할 수 있게 신호.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
  {
    type: 'function',
    name: 'end_session',
    description: '대화를 정중히 마무리하는 마지막 발화 직후 호출. 백엔드에서 세션 종료·추출 트리거.',
    parameters: {
      type: 'object',
      properties: { final_words: { type: 'string', description: '마지막 발화 텍스트' } },
      required: ['final_words'],
    },
  },
] as const;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) return err('OPENAI_API_KEY 미설정', 500);

  const body = await request.json().catch(() => ({}));
  const sessionId = (body as { sessionId?: string }).sessionId;
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');

  const ctx = await fetchSessionContext(sessionId);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  // system instructions — Claude Opus용으로 정교히 짜둔 회상치료 프롬프트를
  // 텍스트 그대로 Realtime에 주입. Realtime이 이 톤을 받아 즉시 응답.
  const instructions = buildSystemPromptBlocks(ctx.member).map((b) => b.text).join('\n');

  const sessionPayload = {
    model: REALTIME_MODEL,
    voice: REALTIME_VOICE,
    instructions,
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    // Whisper로 어르신 발화 텍스트화 — 우리 DB 저장·코치 분석에 사용.
    input_audio_transcription: { model: 'whisper-1', language: 'ko' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: VAD_SILENCE_MS,
    },
    tools: TOOLS,
    tool_choice: 'auto',
    temperature: 0.8,
  };

  try {
    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify(sessionPayload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[realtime/session] OpenAI 응답 오류', res.status, text);
      return err(`Realtime 세션 생성 실패 (${res.status})`, 502);
    }
    const data = (await res.json()) as {
      id?: string;
      client_secret?: { value: string; expires_at: number };
    };
    if (!data.client_secret?.value) {
      return err('client_secret 누락 응답', 502);
    }
    return NextResponse.json({
      sessionId,
      realtimeSessionId: data.id,
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      memberName: ctx.member.name,
    });
  } catch (e) {
    console.error('[realtime/session] 요청 실패', e);
    return err('Realtime 세션 생성 실패', 502);
  }
}
