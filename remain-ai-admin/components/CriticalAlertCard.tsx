'use client';

import Link from 'next/link';
import type { LiveSession } from '@/lib/live-sessions';
import { alertLevelLabel } from '@/lib/live-sessions';

export default function CriticalAlertCard({ session, onSelect }: { session: LiveSession; onSelect: (s: LiveSession) => void }) {
  const topAlert = session.alerts[0];
  return (
    <div className="
 relative rounded-2xl
 bg-gradient-to-br from-red-50 via-red-50 to-white
 ring-1 ring-red-200
 shadow-[0_4px_18px_-8px_rgba(239,68,68,0.35)]
 overflow-hidden
 ">
      {/* 좌측 강조 바 */}
      <span className="absolute left-0 top-4 bottom-4 w-1 rounded-r bg-red-500" aria-hidden />

      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* 펄스 아이콘 */}
          <span className="relative grid place-items-center w-10 h-10 rounded-full bg-red-100 shrink-0">
            <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" aria-hidden />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-700 relative" aria-hidden>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white tracking-wide">
                {topAlert ? alertLevelLabel(topAlert.level) : '주의'}
              </span>
              <span className="text-[11px] text-red-700 font-semibold tracking-wide tabular-nums">
                {session.elapsedMinutes}분째 진행 중
              </span>
            </div>
            <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 truncate dark:text-slate-100">
              {session.elderly.name} 회원님 — {topAlert?.kind ?? '위기 신호 감지'}
            </div>
            <div className="text-[12px] text-slate-500 mt-0.5 truncate dark:text-slate-400">
              {session.facility} · {session.elderly.age}세 · {session.elderly.sessionNumber}회차
            </div>
            {session.recent && (
              <div className="mt-2 text-[13px] text-slate-700 leading-relaxed word-keep-all line-clamp-2 dark:text-slate-300">
                <span className="font-semibold text-slate-900 mr-1 dark:text-slate-100">
                  {session.recent.role === 'elderly' ? '회원님' : 'AI'}:
                </span>
                {session.recent.text}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col sm:w-auto w-full">
          <Link
            href={`/sessions/${session.id}`}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition whitespace-nowrap text-center"
          >
            지금 청취
          </Link>
          <button
            onClick={() => onSelect(session)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 active:scale-[0.99] transition whitespace-nowrap"
          >
            진행자 호출
          </button>
        </div>
      </div>
    </div>
  );
}
