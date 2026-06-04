/**
 * 추출이 안 된 종료 세션들에 대해 일괄로 Claude 추출 + 저장.
 * 마이그레이션(0007) 적용 후 처음 한 번 호출해서 기존 데이터를 살리기 위한 용도.
 *
 *   GET /api/debug/backfill-extractions[?limit=N]
 *   응답: { processed: [{sessionId, ok, reason}], skipped: [...] }
 *
 * 각 세션마다 opus 한 번 호출 → 비용 주의. limit 기본 5.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractSession } from '@/lib/conversation/extractor';
import { fetchSessionContext, fetchTurns, saveExtraction } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 최대 5분 — 여러 세션 처리

export async function GET(request: NextRequest) {
  const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '5')));

  const sb = createServiceRoleClient();
  // extraction이 null인 completed 세션들
  const { data, error } = await sb
    .from('sessions')
    .select('id, turn_count')
    .eq('status', 'completed')
    .is('extraction', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ processed: [], skipped: [], note: '백필 대상 없음' });
  }

  const processed: { sessionId: string; ok: boolean; reason?: string }[] = [];
  const skipped: { sessionId: string; reason: string }[] = [];

  for (const row of data as { id: string; turn_count: number }[]) {
    if (row.turn_count === 0) {
      skipped.push({ sessionId: row.id, reason: 'no_turns' });
      continue;
    }
    try {
      const ctx = await fetchSessionContext(row.id);
      if (!ctx) {
        skipped.push({ sessionId: row.id, reason: 'context_not_found' });
        continue;
      }
      const turns = await fetchTurns(row.id);
      if (turns.length === 0) {
        skipped.push({ sessionId: row.id, reason: 'no_turns_fetched' });
        continue;
      }
      const extraction = await extractSession(ctx.member, turns);
      if (!extraction) {
        processed.push({ sessionId: row.id, ok: false, reason: 'extraction_returned_null' });
        continue;
      }
      const saveResult = await saveExtraction(row.id, extraction);
      processed.push({ sessionId: row.id, ok: saveResult.ok, reason: saveResult.error });
    } catch (e) {
      processed.push({ sessionId: row.id, ok: false, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ processed, skipped, remaining: data.length === limit ? '있을 수 있음 (다시 호출)' : '없음' });
}
