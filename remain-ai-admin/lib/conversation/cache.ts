/**
 * 세션 컨텍스트/턴 캐시 — Upstash Redis.
 *
 * 대화 한 턴마다 Supabase로 2번 왕복(fetchSessionContext + fetchTurns)을 하는데
 * 컨텍스트는 거의 안 변하고 턴은 단조 증가만 한다 → 캐시하면 매 턴 ~200–500ms 절감.
 *
 * 환경변수가 없으면(미설정) 모든 함수는 no-op로 동작하므로
 * 로컬 개발이나 Redis 다운 시 graceful degradation.
 *
 * 키:
 *   session:{id}:ctx    SessionContext (status·member 등)
 *   session:{id}:turns  TurnRow[] (turnIndex 오름차순)
 *
 * 무효화:
 *   - endSession 시 ctx 무효화 (status가 바뀌므로)
 *   - appendTurn 시 turns에 append (전체 재페치 X)
 *
 * TTL 1시간 — 세션은 보통 그 안에 끝나고, 오래된 키는 자연 소멸.
 */

import 'server-only';
import { Redis } from '@upstash/redis';
import type { SessionContext, TurnRow } from '@/lib/sessions-server';

let _redis: Redis | null = null;
let _disabledLogged = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!_disabledLogged) {
      console.warn('[cache] UPSTASH_REDIS_REST_URL/TOKEN 미설정 — 세션 캐시 비활성 (Supabase 직접 조회).');
      _disabledLogged = true;
    }
    return null;
  }
  _redis = new Redis({ url, token });
  return _redis;
}

const TTL_SEC = 60 * 60;
const ctxKey = (sid: string) => `session:${sid}:ctx`;
const turnsKey = (sid: string) => `session:${sid}:turns`;

export async function getCachedContext(sessionId: string): Promise<SessionContext | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get<SessionContext>(ctxKey(sessionId));
  } catch (e) {
    console.warn('[cache] getCachedContext 실패', e);
    return null;
  }
}

export async function setCachedContext(sessionId: string, ctx: SessionContext): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(ctxKey(sessionId), ctx, { ex: TTL_SEC });
  } catch (e) {
    console.warn('[cache] setCachedContext 실패', e);
  }
}

export async function invalidateContext(sessionId: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(ctxKey(sessionId));
  } catch (e) {
    console.warn('[cache] invalidateContext 실패', e);
  }
}

export async function getCachedTurns(sessionId: string): Promise<TurnRow[] | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get<TurnRow[]>(turnsKey(sessionId));
  } catch (e) {
    console.warn('[cache] getCachedTurns 실패', e);
    return null;
  }
}

export async function setCachedTurns(sessionId: string, turns: TurnRow[]): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(turnsKey(sessionId), turns, { ex: TTL_SEC });
  } catch (e) {
    console.warn('[cache] setCachedTurns 실패', e);
  }
}

/** 새 턴을 캐시에 append. 캐시 미스(없음)면 아무 일도 안 함 — 다음 fetchTurns가 DB에서 새로 채움. */
export async function appendCachedTurn(sessionId: string, turn: TurnRow): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const current = await r.get<TurnRow[]>(turnsKey(sessionId));
    if (!current) return;
    const idx = current.findIndex((t) => t.turnIndex === turn.turnIndex);
    if (idx >= 0) current[idx] = turn;
    else current.push(turn);
    current.sort((a, b) => a.turnIndex - b.turnIndex);
    await r.set(turnsKey(sessionId), current, { ex: TTL_SEC });
  } catch (e) {
    console.warn('[cache] appendCachedTurn 실패', e);
  }
}
