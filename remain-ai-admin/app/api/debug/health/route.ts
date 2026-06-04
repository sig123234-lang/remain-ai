/**
 * 환경변수·DB 연결 헬스체크.
 * 키 값이 아니라 boolean(설정됨/안됨)만 반환 — 노출 위험 없음.
 * 운영용은 아니고 배포 후 셋업 검증 용도.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const env = {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  // service-role 키로 실제 DB 연결까지 시도 — 키가 있어도 invalid면 잡힘
  let dbReachable: boolean | null = null;
  let dbError: string | null = null;
  if (env.supabase_service_role && env.supabase_url) {
    try {
      const sb = createServiceRoleClient();
      const { error } = await sb.from('members').select('id', { count: 'exact', head: true });
      dbReachable = !error;
      if (error) dbError = error.message;
    } catch (e) {
      dbReachable = false;
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json({
    env,
    dbReachable,
    dbError,
    deployedAt: new Date().toISOString(),
  });
}
