'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SessionsBoard from '@/components/SessionsBoard';
import NewSessionDialog from '@/components/NewSessionDialog';
import type { LiveSession } from '@/lib/live-sessions';
import type { Member } from '@/lib/members';

export default function SessionsClient({ members }: { members: Member[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // 백엔드 연결 전 — 실시간 세션은 sessions 테이블 + 실시간 스트림에서 옴.
  const sessions: LiveSession[] = [];

  return (
    <>
      <PageHeader
        title="실시간 세션"
        description="여러 세션을 한 화면에서 모니터링합니다. 위험도 높은 세션이 자동으로 위에 표시됩니다."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-[12px] font-semibold text-slate-600">
              <span className="relative inline-flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative inline-flex rounded-full bg-emerald-400 w-2 h-2" />
              </span>
              실시간
            </span>
            <button
              onClick={() => setDialogOpen(true)}
              disabled={members.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title={members.length === 0 ? '먼저 회원을 등록하세요' : undefined}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              대화 시작
            </button>
          </div>
        }
      />

      <SessionsBoard sessions={sessions} />

      <NewSessionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} members={members} />
    </>
  );
}
