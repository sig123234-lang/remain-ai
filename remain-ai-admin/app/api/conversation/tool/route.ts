/**
 * Realtime의 function call을 위임받아 DB·세션 상태에 반영.
 *
 *   POST /api/conversation/tool  body: { sessionId, name, arguments }
 *
 * Realtime이 호출한 function의 결과를 우리 서버가 처리한 뒤,
 * 모델에게 돌려줄 짧은 텍스트(`output`)와 클라이언트가 추가로 취해야 할 동작 플래그를 반환.
 *
 * 지원 tool:
 *   mark_treasure       — sessions.treasure_detected = true
 *   flag_taboo_breach   — sessions.risk_flagged = true
 *   request_wrapup      — sessions.status = 'wrapup'  + wrapupMode:true (클라가 instructions 주입)
 *   end_session         — finalizeSession (status=completed + Claude 추출)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { invalidateContext } from '@/lib/conversation/cache';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchSessionContext, finalizeSession } from '@/lib/sessions-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type ToolName = 'mark_treasure' | 'flag_taboo_breach' | 'request_wrapup' | 'end_session';

interface ToolBody {
  sessionId?: string;
  name?: string;
  arguments?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as ToolBody;
  const { sessionId } = body;
  const name = body.name as ToolName | undefined;
  const args = body.arguments ?? {};
  if (typeof sessionId !== 'string' || !sessionId) return err('sessionId 누락');
  if (!name) return err('name 누락');

  const ctx = await fetchSessionContext(sessionId);
  if (!ctx) return err('세션을 찾을 수 없습니다.', 404);

  const sb = createServiceRoleClient();

  switch (name) {
    case 'mark_treasure': {
      const { error } = await sb
        .from('sessions')
        .update({ treasure_detected: true })
        .eq('id', sessionId);
      if (error) console.error('[tool/mark_treasure] DB 실패', error.message);
      console.log('[tool] treasure', sessionId, args);
      return NextResponse.json({
        ok: true,
        output: '소중한 기억으로 표시했습니다. 그 주변에 좀 더 머무르겠습니다.',
      });
    }

    case 'flag_taboo_breach': {
      const { error } = await sb
        .from('sessions')
        .update({ risk_flagged: true })
        .eq('id', sessionId);
      if (error) console.error('[tool/flag_taboo] DB 실패', error.message);
      console.warn('[tool] taboo', sessionId, args);
      return NextResponse.json({
        ok: true,
        output: '주제를 부드럽게 다른 따뜻한 기억으로 전환하세요.',
      });
    }

    case 'request_wrapup': {
      const { error } = await sb
        .from('sessions')
        .update({ status: 'wrapup' })
        .eq('id', sessionId);
      if (error) console.error('[tool/wrapup] DB 실패', error.message);
      // 캐시의 status가 stale 되지 않게 무효화 (다음 조회 시 새로 채워짐)
      await invalidateContext(sessionId);
      console.log('[tool] wrapup', sessionId, args);
      return NextResponse.json({
        ok: true,
        output: '대화를 마무리 톤으로 전환합니다.',
        wrapupMode: true,
      });
    }

    case 'end_session': {
      // finalizeSession이 endSession + 추출까지 처리 (이미 종료된 세션은 추출만)
      const result = await finalizeSession(sessionId);
      if (!result.ok) console.error('[tool/end_session] 실패', result.error);
      console.log('[tool] end', sessionId, args);
      return NextResponse.json({
        ok: true,
        output: '대화를 마무리하고 보호자 리포트 준비에 들어갑니다.',
        ended: true,
      });
    }

    default:
      return err(`알 수 없는 tool: ${name}`);
  }
}
