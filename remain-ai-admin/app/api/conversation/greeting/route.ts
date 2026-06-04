/**
 * 세션 진입 시 AI가 먼저 건넬 인사 — Claude로 생성(스트림) 후 문장 단위 TTS(SSE).
 * 이미 첫 AI 발화가 DB에 있으면 LLM 생략하고 그 텍스트를 바로 TTS (재진입 대응).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { isOpenAIConfigured } from '@/lib/conversation/openai';
import { buildSystemPromptBlocks } from '@/lib/conversation/system-prompt';
import { createConversationStream } from '@/lib/conversation/stream';
import { appendTurn, fetchSessionContext, fetchTurns } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isAnthropicConfigured()) return err('ANTHROPIC_API_KEY 미설정', 500);
  if (!isOpenAIConfigured()) return err('OPENAI_API_KEY 미설정', 500);

  const body = await request.json().catch(() => ({}));
  const sessionId = (body as { sessionId?: string }).sessionId;
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');

  // 세션 컨텍스트 + 기존 턴 병렬 조회 (인사 라우트라 STT 없음)
  const [ctx, existing] = await Promise.all([
    fetchSessionContext(sessionId),
    fetchTurns(sessionId),
  ]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  // 이미 첫 AI 발화가 있으면 재사용 — LLM 생략, 텍스트만 TTS
  const firstAi = existing.find((t) => t.role === 'ai');
  if (firstAi) {
    return createConversationStream({ fixedText: firstAi.text });
  }

  return createConversationStream({
    systemPrompt: buildSystemPromptBlocks(ctx.member),
    messages: [{ role: 'user', content: '(세션 시작 — 어르신과 첫 인사를 나눠 주세요. 1~2문장으로 가볍게.)' }],
    maxTokens: 256,
    onComplete: async (greeting) => {
      if (greeting) await appendTurn(sessionId, 'ai', greeting, 0);
    },
  });
}
