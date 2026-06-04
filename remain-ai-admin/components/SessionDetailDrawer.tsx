'use client';

import { useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { endSessionAction } from '@/app/(admin)/sessions/actions';
import type { LiveSession } from '@/lib/live-sessions';
import { alertLevelLabel, cognitiveLabel, depthLabel, phaseLabel, riskLabel } from '@/lib/live-sessions';

export default function SessionDetailDrawer({
  session,
  onClose,
}: {
  session: LiveSession | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [endPending, startEndTransition] = useTransition();
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

  function handleEnd() {
    if (!session) return;
    if (!confirm(`${session.elderly.name}님의 세션을 종료할까요?`)) return;
    startEndTransition(async () => {
      const result = await endSessionAction(session.id);
      if (!result.ok) {
        alert(`종료 실패: ${result.error}`);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <button
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-fade-in"
      />
      <aside
        role="dialog"
        aria-label={`${session.elderly.name} 회원님 세션 상세`}
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 dark:border-slate-800">
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight dark:text-slate-100">
              {session.elderly.name} 회원님
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5 dark:text-slate-500">
              {session.elderly.age}세 · {cognitiveLabel(session.elderly.cognitiveLevel)} · {session.elderly.sessionNumber}회차 · {session.facility}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-slate-100 active:scale-95 transition dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden>
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
                    <span className="font-bold mr-1">{alertLevelLabel(a.level)}:</span>
                    {a.kind}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 진행 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">진행 상황</div>
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="text-[11px] text-slate-400 dark:text-slate-500">경과 시간</dt>
                <dd className="text-[18px] font-bold text-slate-800 tabular-nums dark:text-slate-200">{session.elapsedMinutes}분</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="text-[11px] text-slate-400 dark:text-slate-500">턴</dt>
                <dd className="text-[18px] font-bold text-slate-800 tabular-nums dark:text-slate-200">{session.turnCount}/{session.hardCapTurns}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="text-[11px] text-slate-400 dark:text-slate-500">세션 단계</dt>
                <dd className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{phaseLabel(session.sessionPhase)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <dt className="text-[11px] text-slate-400 dark:text-slate-500">대화 깊이 · 위험도</dt>
                <dd className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{depthLabel(session.depthLevel)} · {riskLabel(session.riskLevel)}</dd>
              </div>
            </dl>
          </section>

          {/* 주제 */}
          {session.currentTopic && (
            <section>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">현재 주제</div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">{session.currentTopic}</div>
              </div>
            </section>
          )}

          {/* 직전 발화 */}
          {session.recent && (
            <section>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">직전 발화</div>
              <div className={`rounded-lg p-3 ${session.recent.role === 'elderly' ? 'bg-slate-50' : 'bg-blue-50'}`}>
                <div className={`text-[11px] font-semibold mb-1 ${session.recent.role === 'elderly' ? 'text-slate-500' : 'text-blue-700'}`}>
                  {session.recent.role === 'elderly' ? '회원님' : 'AI 도우미'}
                </div>
                <div className="text-[14px] text-slate-800 leading-relaxed word-keep-all dark:text-slate-200">{session.recent.text}</div>
              </div>
            </section>
          )}

          {/* 플래그 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">상태</div>
            <div className="flex flex-wrap gap-1.5">
              {session.treasureDetected && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
                  깊은 이야기 발견
                </span>
              )}
              {session.consecutiveRefusals > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                  연속 짧은 답 {session.consecutiveRefusals}회
                </span>
              )}
              {session.ruleViolationsActive > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                  응대 점검 필요 {session.ruleViolationsActive}건
                </span>
              )}
              {!session.treasureDetected && session.consecutiveRefusals === 0 && session.ruleViolationsActive === 0 && (
                <span className="text-[12px] text-slate-400 dark:text-slate-500">특이사항 없음</span>
              )}
            </div>
          </section>
        </div>

        {/* 액션 바 (하단 고정) */}
        <div className="border-t border-slate-100 px-5 py-3 bg-white dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/sessions/${session.id}`}
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition text-center"
            >
              실시간 청취
            </Link>
            <button
              type="button"
              disabled
              title="진행자 호출 기능은 추후 활성화됩니다"
              className="px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-400 text-[12px] font-semibold transition cursor-not-allowed dark:text-slate-600 dark:bg-slate-800/30 dark:ring-slate-800"
            >
              진행자 호출
            </button>
            <button
              onClick={handleEnd}
              disabled={endPending}
              className="px-3 py-2.5 rounded-xl bg-red-50 ring-1 ring-red-200 text-red-700 text-[12px] font-semibold hover:bg-red-100 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {endPending ? '종료 중…' : '세션 종료'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 text-center dark:text-slate-500">
            실시간 청취 페이지로 이동합니다. 진행자 호출은 백엔드 연결 후 활성화.
          </p>
        </div>
      </aside>
    </>
  );
}
