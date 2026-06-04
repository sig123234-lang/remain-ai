/**
 * Realtime 백그라운드 코치 — Claude Opus가 최근 N턴을 보고 다음 AI 응답의 톤·방향 가이드를 제안.
 *
 *   POST /api/conversation/coach  body: { sessionId, lookback?: number }
 *
 * 응답: { instructions } — Realtime 모델에 session.update로 그대로 주입할 전체 텍스트.
 *   = base 시스템 프롬프트 + 회원 컨텍스트 + 코치가 추가한 "# 다음 응답 가이드" 블록
 *
 * 클라이언트는 AI 응답이 끝날 때마다 호출하고(또는 2~3턴마다 주기적으로),
 * 응답으로 받은 instructions를 다음 어르신 발화 처리 전에 session.update로 주입.
 *
 * Claude TTFT(~9s)는 어차피 백그라운드라 무관 — 어르신 한 호흡 동안 끝남.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { CONVERSATION_MODEL, createMessage, isAnthropicConfigured } from '@/lib/conversation/anthropic';
import { buildSystemPromptBlocks } from '@/lib/conversation/system-prompt';
import { fetchSessionContext, fetchTurns } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_LOOKBACK = 8;

const COACH_SYSTEM = `당신은 한국 어르신 회상치료의 슈퍼바이저입니다.
현장에서 실시간으로 대화하는 AI(Realtime 모델)에게, 직전 N턴을 보고 다음 응답의 톤·방향만 짧게 제시합니다.

# 출력 규칙 (반드시)
- 한국어로, 2~4문장 이내.
- 다음 응답이 어떤 정서/주제/질문을 향해야 하는지만 말합니다. 새 질문 문장을 직접 만들지 말고 "방향"만.
- 어르신이 보물 같은 회상에 진입했으면 그 자리에 더 머무르라고 지시.
- 어르신이 피로/회피 신호를 보이면 다른 안전한 주제로 부드럽게 전환하라고 지시.
- 위기 신호(자해·타해·극심한 우울)가 있으면 "그 마음을 먼저 받고 따뜻한 기억으로 전환"이라고 지시.
- 출력은 본문 텍스트만. 헤더·라벨·따옴표 금지.`;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isAnthropicConfigured()) return err('ANTHROPIC_API_KEY 미설정', 500);

  const body = (await request.json().catch(() => ({}))) as { sessionId?: string; lookback?: number };
  const { sessionId } = body;
  const lookback = Math.max(2, Math.min(20, body.lookback ?? DEFAULT_LOOKBACK));
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');

  const [ctx, allTurns] = await Promise.all([fetchSessionContext(sessionId), fetchTurns(sessionId)]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);

  const baseBlocks = buildSystemPromptBlocks(ctx.member);
  const baseText = baseBlocks.map((b) => b.text).join('\n');

  // 턴 0~1개면 코치할 게 없음 — base만 돌려줌.
  if (allTurns.length < 2) {
    return NextResponse.json({ instructions: baseText, guidance: null });
  }

  const recent = allTurns.slice(-lookback);
  const transcript = recent
    .map((t) => `${t.role === 'ai' ? 'AI' : '어르신'}: ${t.text}`)
    .join('\n');

  try {
    const msg = await createMessage({
      model: CONVERSATION_MODEL,
      max_tokens: 300,
      system: [{ type: 'text', text: COACH_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content:
            `# 회원 정보\n` +
            `${ctx.member.name}님 (${ctx.member.age}세, 인지수준 ${ctx.member.cognitiveLevel})\n\n` +
            `# 최근 ${recent.length}턴 대화\n${transcript}\n\n` +
            `다음 AI 응답의 톤·방향 가이드를 제시하세요.`,
        },
      ],
    });

    const guidance = msg.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
      .trim();

    const instructions = guidance
      ? `${baseText}\n\n# 다음 응답 가이드 (실시간 코치)\n${guidance}`
      : baseText;

    return NextResponse.json({ instructions, guidance: guidance || null });
  } catch (e) {
    console.error('[coach] Claude 호출 실패', e);
    // 코치 실패해도 대화는 계속되어야 함 → base만 돌려줌
    return NextResponse.json({ instructions: baseText, guidance: null });
  }
}
