/**
 * Realtime 모드에서 클라이언트가 발화 1개를 저장할 때 호출.
 *
 *   POST /api/conversation/turn
 *   body: { sessionId, role: 'ai' | 'elderly', text, turnIndex? }
 *
 * 클라이언트는 Realtime의 두 이벤트마다 호출:
 *   - conversation.item.input_audio_transcription.completed → role='elderly'
 *   - response.audio_transcript.done                       → role='ai'
 *
 * 응답으로 다음 turn_count, wrapupMode 여부, 종료 여부 반환. 클라이언트는 wrapup 진입 시
 * session.update로 Realtime에 마무리 가이드를 주입한다.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { buildWrapupSuffix, TURN_CAP, WRAPUP_REMAINING } from '@/lib/conversation/turn-logic';
import { appendTurn, endSession, fetchSessionContext, fetchTurns } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    role?: 'ai' | 'elderly';
    text?: string;
    turnIndex?: number;
  };
  const { sessionId, role, text, turnIndex } = body;
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');
  if (role !== 'ai' && role !== 'elderly') return err('role은 ai|elderly');
  if (typeof text !== 'string' || text.trim().length === 0) return err('text 누락');

  // ctx + 기존 턴 병렬 조회 (캐시 hit 시 거의 0ms)
  const [ctx, existing] = await Promise.all([fetchSessionContext(sessionId), fetchTurns(sessionId)]);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);
  if (ctx.status === 'completed') return err('이미 종료된 세션입니다.', 409);

  // 클라이언트가 명시 안 했으면 현재 길이가 다음 index. (Realtime은 우리 turn 인덱싱 모름 → 서버 기준)
  const idx = typeof turnIndex === 'number' ? turnIndex : existing.length;

  await appendTurn(sessionId, role, text.trim(), idx);

  const totalAfter = idx + 1;
  const remaining = TURN_CAP - totalAfter;
  const ended = totalAfter >= TURN_CAP;
  // role='ai'를 저장한 직후가 wrapup 진입 시점 (다음 어르신 발화부터는 마무리 톤)
  const wrapupMode = role === 'ai' && remaining > 0 && remaining <= WRAPUP_REMAINING;
  const wrapupSuffix = wrapupMode ? buildWrapupSuffix(remaining) : undefined;

  if (ended) {
    await endSession(sessionId);
  }

  return NextResponse.json({
    ok: true,
    turnIndex: idx,
    totalAfter,
    remaining,
    ended,
    wrapupMode,
    wrapupSuffix,
  });
}
