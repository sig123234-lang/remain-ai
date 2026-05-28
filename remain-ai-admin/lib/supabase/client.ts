/**
 * 브라우저 컴포넌트('use client')에서 사용하는 Supabase 클라이언트.
 *
 * 사용 예:
 *   const supabase = createBrowserClient();
 *   const { data, error } = await supabase.from('members').select('*');
 */
'use client';

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createBrowserClient() {
  return createSSRBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/** Supabase 환경변수가 셋업됐는지 — mock fallback 분기용 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
