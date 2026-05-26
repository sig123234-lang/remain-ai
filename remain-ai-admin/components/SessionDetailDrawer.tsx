'use client';

import { useEffect } from 'react';
import type { LiveSession } from '@/lib/live-sessions';
import { cognitiveLabel, phaseLabel } from '@/lib/live-sessions';

export default function SessionDetailDrawer({
  session,
  onClose,
}: {
  session: LiveSession | null;
  onClose: () => void;
}) {
  // ESC로 닫기
  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, onClose]);

  if (!session) return null;

  return (
    <>
      <button
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-fade-in"
      />
      <aside
        role="dialog"
        aria-label={`${session.elderly.name} 어르신 세션 상세`}
        className="
          fixed top-0 right-0 bottom-0 z-50
          w-full sm:w-[480px] max-w-[100vw]
          bg-white shadow-2xl
          flex flex-col
          animate-fade-in-up
          overflow-hidden
        "
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight">
              {session.elderly.name} 어르신
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {session.elderly.age}세 · {cognitiveLabel(session.elderly.cognitiveLevel)} · {session.elderly.sessionNumber}회차 · {session.facility}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-slate-100 active:scale-95 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-700" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 알림 */}
          {session.alerts.length > 0 && (
            <section className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-red-700 mb-2">위기 알림</div>
              <ul className="space-y-1.5">
                {session.alerts.map((a, i) => (
                  <li key={i} className="text-[13px] text-red-800">
                    <span className="font-bold mr-1">Level {a.level}:</span>
                    {a.kind}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 진행 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">진행 상황</div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-[11px] text-slate-400">경과 시간</dt>
                <dd className="text-[18px] font-bold text-slate-800 tabular-nums">{session.elapsedMinutes}분</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-[11px] text-slate-400">턴</dt>
                <dd className="text-[18px] font-bold text-slate-800 tabular-nums">{session.turnCount}/{session.hardCapTurns}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-[11px] text-slate-400">phase</dt>
                <dd className="text-[14px] font-semibold text-slate-800">{phaseLabel(session.sessionPhase)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-[11px] text-slate-400">depth · risk</dt>
                <dd className="text-[14px] font-semibold text-slate-800">L{session.depthLevel} · {session.riskLevel}</dd>
              </div>
            </dl>
          </section>

          {/* 주제 */}
          {session.currentTopic && (
            <section>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">현재 주제</div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[14px] font-semibold text-slate-800">{session.currentTopic}</div>
                {session.currentScene && (
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">{session.currentScene}</div>
                )}
              </div>
            </section>
          )}

          {/* 직전 발화 */}
          {session.recent && (
            <section>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">직전 발화</div>
              <div className={`rounded-lg p-3 ${session.recent.role === 'elderly' ? 'bg-slate-50' : 'bg-blue-50'}`}>
                <div className={`text-[11px] font-semibold mb-1 ${session.recent.role === 'elderly' ? 'text-slate-500' : 'text-blue-700'}`}>
                  {session.recent.role === 'elderly' ? '어르신' : 'AI 도우미'}
                </div>
                <div className="text-[14px] text-slate-800 leading-relaxed word-keep-all">{session.recent.text}</div>
              </div>
            </section>
          )}

          {/* 플래그 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">상태 플래그</div>
            <div className="flex flex-wrap gap-1.5">
              {session.treasureDetected && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
                  보물 감지됨
                </span>
              )}
              {session.consecutiveRefusals > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                  연속 거부 {session.consecutiveRefusals}
                </span>
              )}
              {session.ruleViolationsActive > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                  활성 규칙 위반 {session.ruleViolationsActive}건
                </span>
              )}
              {!session.treasureDetected && session.consecutiveRefusals === 0 && session.ruleViolationsActive === 0 && (
                <span className="text-[12px] text-slate-400">특이사항 없음</span>
              )}
            </div>
          </section>
        </div>

        {/* 액션 바 (하단 고정) */}
        <div className="border-t border-slate-100 px-5 py-3 bg-white">
          <div className="grid grid-cols-3 gap-2">
            <button className="px-3 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition">
              실시간 청취
            </button>
            <button className="px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[12px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition">
              진행자 호출
            </button>
            <button className="px-3 py-2.5 rounded-xl bg-red-50 ring-1 ring-red-200 text-red-700 text-[12px] font-semibold hover:bg-red-100 active:scale-[0.99] transition">
              세션 종료
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center">
            실제 청취/제어는 백엔드 연결 후 활성화됩니다.
          </p>
        </div>
      </aside>
    </>
  );
}
