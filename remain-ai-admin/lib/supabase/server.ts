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
