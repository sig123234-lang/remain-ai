/**
 * Next.js middleware에서 호출하는 Supabase 세션 갱신 + 인증 가드.
 *
 * 매 요청마다:
 *  1. 쿠키 기반 세션 토큰 갱신
 *  2. 미인증 + 보호 경로 접근 시 /login 리다이렉트
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

const PUBLIC_PATHS = ['/login', '/auth', '/r/'];
// API 경로는 미들웨어에서 리다이렉트하지 않고, 라우트 핸들러가 직접 401 JSON 응답.
const API_PREFIX = '/api/';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // env 미설정 시 — 인증 우회 (mock 모드)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));
  const isApi = path.startsWith(API_PREFIX);

  if (!user && !isPublic && !isApi) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/login';
    redirect.searchParams.set('next', path);
    return NextResponse.redirect(redirect);
  }

  // 로그인된 상태에서 /login 접근 시 홈으로
  if (user && path === '/login') {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.searchParams.delete('next');
    return NextResponse.redirect(home);
  }

  return response;
}
