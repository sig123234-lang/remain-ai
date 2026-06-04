/**
 * 세션 종료 + 자동 추출. sessionId만 알면 호출 가능.
 * 어르신 페이지/탭 닫기/관리자 측 모두 공통.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { finalizeSession } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessionId = (body as { sessionId?: string }).sessionId;
  if (typeof sessionId !== 'string' || !sessionId) {
    return NextResponse.json({ error: 'sessionId 누락' }, { status: 400 });
  }
  const result = await finalizeSession(sessionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
