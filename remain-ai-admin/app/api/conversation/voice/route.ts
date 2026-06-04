/**
 * 음성 모드용 — 어르신 발화 오디오를 받아 STT → LLM(스트림) → 문장 단위 TTS(SSE).
 *
 *   POST /api/conversation/voice  (multipart: audio, sessionId)
 *
 * STT(whisper-1)는 스트리밍 불가라 블로킹. 이후 LLM 응답은 토큰 스트림을
 * 문장 단위로 즉시 TTS해 첫 소리까지의 지연을 최소화한다 (lib/conversation/stream).
 */

import { type NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { isOpenAIConfigured, transcribeAudio } from '@/lib/conversation/openai';
import { buildSystemPromptBlocks } from '@/lib/conversation/system-prompt';
import { createConversationStream } from '@/lib/conversation/stream';
import { buildConversationMessages, buildWrapupSuffix, TURN_CAP, WRAPUP_REMAINING } from '@/lib/conversation/turn-logic';
import { appendTurn, endSession, fetchSessionContext, fetchTurns } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  if (!isAnthropicConfigured()) return err('ANTHROPIC_API_KEY 미설정', 500);
  if (!isOpenAIConfigured()) return err('OPENAI_API_KEY 미설정', 500);

  // 1. multipart 파싱
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return err('multipart/form-data 요청이 필요합니다.');
  }
  const audio = formData.get('audio');
  const sessionId = formData.get('sessionId');
  if (!(audio instanceof File)) return err('audio 파일 누락');
  if (typeof sessionId !== 'string' || sessionId.length === 0) return err('sessionId 누락');

  // 2. 세션 검증 + 히스토리 조회 + STT를 병렬 실행 — STT가 가장 길어 DB 시간이 그 뒤에 숨음.
  const sttStart = Date.now();
  const [ctx, existingTurns, sttResult] = await Promise.all([
    fetchSessionContext(sessionId),
    fetchTurns(sessionId),
    transcribeAudio(audio).then(
      (text) => ({ ok: true as const, text }),
      (e) => ({ ok: false as const, error: e }),
    ),
  ]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  if (existingTurns.length >= TURN_CAP) {
    await endSession(sessionId);
    return NextResponse.json({ ended: true, reason: 'turn_cap_reached', message: '오늘 대화는 충분히 나눴어요.' });
  }

  if (!sttResult.ok) {
    console.error('[voice] STT 실패', sttResult.error);
    return err('음성 인식 실패', 502);
  }
  const userText = sttResult.text;
  console.log(`[timing:voice] STT+DB 병렬 ${Date.now() - sttStart}ms (@${Date.now() - t0}ms, ${(audio.size / 1024).toFixed(0)}KB)`);
  if (userText.length < 2) {
    // 발화 너무 짧음 — 응답 없이 skipped 이벤트만 보내고 닫음 (클라이언트는 다시 청취)
    return createConversationStream({
      fixedText: '',
      prelude: [{ type: 'skipped', reason: 'too_short', transcript: userText }],
    });
  }

  const userTurnIndex = existingTurns.length;
  const aiTurnIndex = userTurnIndex + 1;
  const totalAfter = aiTurnIndex + 1;
  const ended = totalAfter >= TURN_CAP;
  const remainingAfterThisAI = TURN_CAP - totalAfter;
  const wrapupMode = remainingAfterThisAI <= WRAPUP_REMAINING;

  // 어르신 발화 저장 — 크리티컬 경로 밖에서 (LLM 스트림과 병렬)
  const userTurnWrite = appendTurn(sessionId, 'elderly', userText, userTurnIndex).catch((e) =>
    console.error('[voice] 어르신 턴 저장 실패', e),
  );

  const messages: Anthropic.MessageParam[] = buildConversationMessages(existingTurns, userText);

  const systemPrompt = buildSystemPromptBlocks(
    ctx.member,
    wrapupMode ? buildWrapupSuffix(remainingAfterThisAI) : undefined,
  );

  return createConversationStream({
    systemPrompt,
    messages,
    maxTokens: 512,
    meta: { wrapupMode, turnCount: totalAfter, transcript: userText },
    ended,
    t0,
    label: 'voice',
    onComplete: async (aiText) => {
      await userTurnWrite;
      if (aiText) await appendTurn(sessionId, 'ai', aiText, aiTurnIndex);
      if (ended) await endSession(sessionId);
    },
  });
}
