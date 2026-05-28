import { type NextRequest } from 'next/server';
// 상대 경로 사용 — Vercel Edge runtime이 '@/...' tsconfig alias를
// middleware 번들에서 풀지 못해서 "unsupported modules" 에러가 남.
import { updateSession } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 모든 경로 매칭 — 단, 다음은 제외:
     *  - _next/static, _next/image (정적 자산)
     *  - favicon, image 파일
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
