/**
 * 서버 컴포넌트 / Route Handler / Server Action에서 사용하는 Supabase 클라이언트.
 *
 * Next.js cookies()와 통합되어 인증 세션을 자동 유지.
 *
 * 사용 예 (Server Component):
 *   const supabase = await createServerClient();
 *   const { data } = await supabase.from('members').select('*');
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서는 cookie set이 무시될 수 있음 — middleware에서 처리
          }
        },
      },
    },
  );
}

/** Supabase 환경변수가 셋업됐는지 — mock fallback 분기용 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * RLS를 우회하는 service-role 클라이언트.
 *
 * 어르신 세션 페이지(/session/*)·음성 API는 로그인 없이 접근하므로 RLS로 막힘.
 * sessionId UUID 자체가 credential 역할 (URL을 아는 사람만 진입).
 *
 * ⚠️ 클라이언트 컴포넌트·브라우저에 절대 노출 금지. server-only.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service-role 환경변수가 설정되지 않았습니다.');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
