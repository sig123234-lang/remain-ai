import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Next 16: middleware → proxy로 컨벤션 변경. proxy는 기본 Node.js runtime
// 이라 Edge 제약(예: @supabase/ssr 호환성 이슈) 없이 동작.
// 내부 함수명·헬퍼 파일명(lib/supabase/middleware.ts)은 그대로 유지.
export async function proxy(request: NextRequest) {
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
