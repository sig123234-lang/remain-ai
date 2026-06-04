/**
 * 속기사 모드용 — STT 건너뛰고 텍스트로 어르신 발화 받음.
 *
 *   POST /api/conversation/text
 *   body: { sessionId, text }
 *
 * 응답은 SSE 스트림 (lib/conversation/stream). LLM 토큰을 문장 단위로 즉시 TTS해
 * 첫 소리까지의 지연을 최소화한다. voice 라우트의 STT 단계만 빠진 변형.
 */

import { type NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { isOpenAIConfigured } from '@/lib/conversation/openai';
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

  const body = await request.json().catch(() => ({}));
  const sessionId = (body as { sessionId?: string }).sessionId;
  const inputText = (body as { text?: string }).text;
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');
  if (typeof inputText !== 'string' || inputText.trim().length === 0) return err('text 누락');

  const userText = inputText.trim();

  // 세션 검증 + 히스토리 조회 병렬 — 두 쿼리가 독립이라 같이 묶음.
  const [ctx, existingTurns] = await Promise.all([
    fetchSessionContext(sessionId),
    fetchTurns(sessionId),
  ]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  if (existingTurns.length >= TURN_CAP) {
    await endSession(sessionId);
    return NextResponse.json({ ended: true, reason: 'turn_cap_reached', message: '오늘 대화는 충분히 나눴어요.' });
  }

  const userTurnIndex = existingTurns.length;
  const aiTurnIndex = userTurnIndex + 1;
  const totalAfter = aiTurnIndex + 1; // 이 AI 응답까지 포함한 누적 턴 수
  const ended = totalAfter >= TURN_CAP;
  const remainingAfterThisAI = TURN_CAP - totalAfter;
  const wrapupMode = remainingAfterThisAI <= WRAPUP_REMAINING;

  // 어르신 발화 저장 — 크리티컬 경로 밖에서 진행 (LLM 스트림과 병렬)
  const userTurnWrite = appendTurn(sessionId, 'elderly', userText, userTurnIndex).catch((e) =>
    console.error('[text] 어르신 턴 저장 실패', e),
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
    label: 'text',
    onComplete: async (aiText) => {
      await userTurnWrite;
      if (aiText) await appendTurn(sessionId, 'ai', aiText, aiTurnIndex);
      if (ended) await endSession(sessionId);
    },
  });
}
