/**
 * 최근 세션 + 대화 턴을 한 번에 보여주는 디버그 뷰.
 * 시스템 프롬프트대로 Claude가 응답하는지 검증용.
 * service-role 사용 — RLS 우회. 운영용 X.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const limit = Math.min(20, Math.max(1, Number(request.nextUrl.searchParams.get('limit') ?? '5')));

  try {
    const sb = createServiceRoleClient();

    const { data: sessions, error: sErr } = await sb
      .from('sessions')
      .select('id, session_number, status, started_at, turn_count, extraction, members ( name, age, cognitive_level )')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    if (!sessions || sessions.length === 0) return NextResponse.json({ sessions: [] });

    const ids = (sessions as unknown as { id: string }[]).map((s) => s.id);
    const { data: turns, error: tErr } = await sb
      .from('conversation_turns')
      .select('session_id, turn_index, role, text')
      .in('session_id', ids)
      .order('turn_index', { ascending: true });

    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

    const turnsBySession = new Map<string, { role: 'ai' | 'elderly'; text: string; turn_index: number }[]>();
    for (const t of (turns ?? []) as { session_id: string; turn_index: number; role: 'ai' | 'elderly'; text: string }[]) {
      const arr = turnsBySession.get(t.session_id) ?? [];
      arr.push({ role: t.role, text: t.text, turn_index: t.turn_index });
      turnsBySession.set(t.session_id, arr);
    }

    const result = (sessions as unknown as Array<{
      id: string;
      session_number: number;
      status: string;
      started_at: string;
      turn_count: number;
      extraction: unknown;
      members: { name: string; age: number; cognitive_level: string } | null;
    }>).map((s) => ({
      sessionId: s.id,
      sessionNumber: s.session_number,
      status: s.status,
      startedAt: s.started_at,
      turnCount: s.turn_count,
      member: s.members,
      hasExtraction: Boolean(s.extraction),
      extractionPreview: s.extraction ? {
        keyMemoriesCount: (s.extraction as { keyMemories?: unknown[] }).keyMemories?.length ?? 0,
        treasuresCount: (s.extraction as { emotionalTreasures?: unknown[] }).emotionalTreasures?.length ?? 0,
        peopleCount: (s.extraction as { entities?: { people?: unknown[] } }).entities?.people?.length ?? 0,
        mainTopic: (s.extraction as { guardianReport?: { mainTopic?: string } }).guardianReport?.mainTopic ?? null,
        reportStatus: (s.extraction as { reportStatus?: string }).reportStatus ?? null,
      } : null,
      turns: turnsBySession.get(s.id) ?? [],
    }));

    return NextResponse.json({ sessions: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
