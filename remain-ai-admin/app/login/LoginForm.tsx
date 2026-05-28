'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseReady = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setError('Supabase가 아직 연결되지 않았어요. .env.local 셋업이 필요합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '로그인 실패';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-6 bg-slate-50">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <span className="inline-flex items-baseline text-[28px] tracking-tight leading-none">
            <span className="font-medium text-slate-700">rem</span>
            <span className="font-bold text-slate-900">AI</span>
            <span className="font-medium text-slate-700">n</span>
            <span className="ml-2 text-[12px] font-semibold tracking-widest text-slate-400 uppercase">Admin</span>
          </span>
        </div>

        <div className="rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 p-7">
          <h1 className="text-[18px] font-bold text-slate-900 mb-1">로그인</h1>
          <p className="text-[12px] text-slate-500 mb-6">관리자 계정 정보로 로그인하세요.</p>

          {!supabaseReady && (
            <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2 text-[12px] text-amber-800">
              <div className="font-semibold mb-0.5">개발 모드 — Supabase 미연결</div>
              <div className="text-amber-700">.env.local에 SUPABASE 키를 추가하면 활성화됩니다. SUPABASE_SETUP.md 참고.</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">이메일</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@example.com"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">비밀번호</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[12px] text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[14px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          비밀번호 재설정·계정 추가는 Supabase 대시보드에서 처리합니다.
        </p>
      </div>
    </div>
  );
}
