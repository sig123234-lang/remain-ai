/**
 * Realtime 모드용 — Claude가 만든 첫 인사 텍스트만 반환 (TTS 없음).
 *
 *   POST /api/realtime/greeting  body: { sessionId }
 *
 * 클라이언트는 이 텍스트를 Realtime의 첫 response.create instructions로 주입해
 * "이 문장을 어르신께 그대로 따뜻하게 읽어드리세요" 형태로 낭독시킨다.
 *
 * 이미 첫 ai 턴이 DB에 있으면 그대로 재사용 (재진입 대응).
 * 새로 생성한 경우 turn 0에 저장.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { CONVERSATION_MODEL, createMessage, isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { buildSystemPromptBlocks } from '@/lib/conversation/system-prompt';
import { appendTurn, fetchSessionContext, fetchTurns } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isAnthropicConfigured()) return err('ANTHROPIC_API_KEY 미설정', 500);

  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const sessionId = body.sessionId;
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');

  const [ctx, existing] = await Promise.all([fetchSessionContext(sessionId), fetchTurns(sessionId)]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  // 첫 ai 턴이 있으면 재사용
  const firstAi = existing.find((t) => t.role === 'ai');
  if (firstAi) return NextResponse.json({ text: firstAi.text, reused: true });

  try {
    const msg = await createMessage({
      model: CONVERSATION_MODEL,
      max_tokens: 200,
      system: buildSystemPromptBlocks(ctx.member),
      messages: [
        {
          role: 'user',
          content: '(세션 시작 — 어르신과 첫 인사를 나눠 주세요. 1~2문장으로 가볍게.)',
        },
      ],
    });
    const text = msg.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
      .trim();
    if (!text) return err('인사 생성 실패', 502);

    await appendTurn(sessionId, 'ai', text, 0);
    return NextResponse.json({ text, reused: false });
  } catch (e) {
    console.error('[realtime/greeting] 실패', e);
    return err('인사 생성 실패', 502);
  }
}
