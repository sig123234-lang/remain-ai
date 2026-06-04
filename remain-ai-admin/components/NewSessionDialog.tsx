'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Member, cognitiveBadge, timeAgoKo } from '@/lib/members';
import { createSessionAction } from '@/app/(admin)/sessions/actions';
import type { SessionMode } from '@/lib/sessions-server';
import { Pill } from './Card';

type Step = 'pick' | 'link';

export default function NewSessionDialog({
  open,
  onClose,
  members,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
}) {
  const [step, setStep] = useState<Step>('pick');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Member | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mode, setMode] = useState<SessionMode>('realtime');

  // open이 false → true 전이 시에만 상태 초기화. onClose 변경 시 재실행되면 안 됨
  // (부모 polling으로 인라인 함수가 매번 새로 만들어지면서 다이얼로그 상태가 리셋되는 버그 방지)
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setQuery('');
    setPicked(null);
    setSessionId('');
    setCreating(false);
    setCreateError(null);
    setLinkCopied(false);
    setMode('realtime');
  }, [open]);

  // ESC 닫기 — onClose 갱신 따라가도 무방 (state 초기화 아님)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.includes(q) ||
        m.facility.includes(q) ||
        (m.guardianName ?? '').includes(q),
    );
  }, [query, members]);

  if (!open) return null;

  async function handlePick(m: Member) {
    setPicked(m);
    setCreating(true);
    setCreateError(null);
    setStep('link');
    const result = await createSessionAction(m.id, mode);
    setCreating(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    setSessionId(result.sessionId);
  }

  const link = picked && sessionId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/admin/session/${sessionId}`
    : '';

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback — 선택만
    }
  }

  function handleOpen() {
    if (!link) return;
    window.open(link, '_blank', 'noopener');
  }

  return (
    <>
      <button
        aria-label="닫기"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="새 대화 시작"
        className="
 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
 w-[92vw] max-w-[520px]
 max-h-[88vh]
 bg-white rounded-2xl shadow-2xl
 flex flex-col overflow-hidden
 animate-fade-in-up
 "
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 dark:border-slate-800">
          <div>
            <div className="text-[16px] font-bold text-slate-900 tracking-tight dark:text-slate-100">
              {step === 'pick' ? '새 대화 시작' : '대화 링크 준비됨'}
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5 dark:text-slate-500">
              {step === 'pick'
                ? '대화할 회원님을 선택하면 고유 링크가 만들어져요'
                : '이 링크로 접속하면 바로 대화가 시작돼요'}
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

        {/* STEP 1: 회원 선택 */}
        {step === 'pick' && (
          <>
            {/* 운영 모드 선택 */}
            <div className="px-5 pt-4 pb-1">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 mb-2">운영 모드</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('realtime')}
                  className={`text-left px-3 py-2.5 rounded-xl ring-1 transition ${
                    mode === 'realtime'
                      ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-[13px] font-semibold">실시간 음성</div>
                  <div className={`text-[11px] mt-0.5 ${mode === 'realtime' ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                    1초 내 응답 · 인터럽션 자연
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('voice')}
                  className={`text-left px-3 py-2.5 rounded-xl ring-1 transition ${
                    mode === 'voice'
                      ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-[13px] font-semibold">일반 음성</div>
                  <div className={`text-[11px] mt-0.5 ${mode === 'voice' ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                    Whisper·Claude·TTS
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('stenographer')}
                  className={`text-left px-3 py-2.5 rounded-xl ring-1 transition ${
                    mode === 'stenographer'
                      ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-[13px] font-semibold">속기사</div>
                  <div className={`text-[11px] mt-0.5 ${mode === 'stenographer' ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>
                    진행자가 타이핑
                  </div>
                </button>
              </div>
            </div>

            <div className="px-5 pt-3 pb-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                placeholder="이름·시설·보호자명 검색"
                className="
 w-full px-3 py-2.5 rounded-xl
 bg-slate-50 ring-1 ring-slate-100
 text-[14px] text-slate-800 placeholder:text-slate-400
 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:text-slate-200 dark:bg-slate-800/50 dark:ring-slate-800 dark:placeholder:text-slate-500
 "
              />
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                총 {filtered.length}명 · 진행 중 표시된 회원님은 새 세션 시작 시 기존 세션 종료
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 pb-3">
              {filtered.length === 0 ? (
                <li className="text-center text-[13px] text-slate-400 py-10 dark:text-slate-500">검색 결과가 없어요</li>
              ) : (
                filtered.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => handlePick(m)}
                      className="
 group w-full text-left
 flex items-center gap-3
 px-3 py-2.5 rounded-xl
 hover:bg-slate-50 active:bg-slate-100
 transition dark:hover:bg-slate-800/50
 "
                    >
                      <div className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold shrink-0 dark:text-slate-400 dark:bg-slate-800">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{m.name}</span>
                          <span className="text-[12px] text-slate-400 dark:text-slate-500">{m.age}세</span>
                          {m.inActiveSession && <Pill tone="success">진행 중</Pill>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate dark:text-slate-500">
                          {cognitiveBadge(m.cognitiveLevel)} · {m.facility} · {m.sessionCount}회차 · 마지막 {timeAgoKo(m.lastSessionAt)}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition dark:group-hover:text-slate-400" aria-hidden>
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}

        {/* STEP 2: 링크 표시 */}
        {step === 'link' && picked && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* 선택된 회원 */}
            <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3 dark:bg-slate-800/50">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-[14px] font-bold shrink-0 dark:text-slate-300 dark:ring-slate-700">
                {picked.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                  {picked.name} <span className="font-normal text-slate-500 dark:text-slate-400">{picked.age}세</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate dark:text-slate-500">
                  {cognitiveBadge(picked.cognitiveLevel)} · {picked.facility} · {picked.sessionCount + 1}회차로 시작
                </div>
              </div>
              <button
                onClick={() => setStep('pick')}
                className="ml-auto shrink-0 px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                변경
              </button>
            </div>

            {/* 링크 박스 */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">대화 링크</div>
              {creating ? (
                <div className="rounded-xl bg-slate-900 text-slate-400 p-4 font-mono text-[12px] flex items-center gap-2 dark:text-slate-500">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                  세션 생성 중…
                </div>
              ) : createError ? (
                <div className="rounded-xl bg-red-50 ring-1 ring-red-200 text-red-700 p-4 text-[12px]">
                  세션 생성 실패: {createError}
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-slate-900 text-white p-4 font-mono text-[12px] break-all leading-relaxed">
                    {link}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                    <span>세션 ID: {sessionId.slice(0, 8)}…</span>
                  </div>
                </>
              )}
            </div>

            {/* 액션 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                disabled={!link}
                className={`
                  px-4 py-3 rounded-xl
                  text-[13px] font-semibold
                  flex items-center justify-center gap-2
                  transition
                  ${linkCopied
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-slate-50 ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100'}
                `}
              >
                {linkCopied ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    복사됨
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    링크 복사
                  </>
                )}
              </button>
              <button
                onClick={handleOpen}
                disabled={!link}
                className="
 px-4 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-semibold
 hover:bg-slate-800 active:scale-[0.99]
 flex items-center justify-center gap-2 transition
 disabled:opacity-50 disabled:cursor-not-allowed
 "
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                새 탭에서 열기
              </button>
            </div>

            {/* 보호자 안내 */}
            {picked.guardianName && (
              <div className="rounded-xl bg-blue-50/60 ring-1 ring-blue-100 p-3 text-[12px] text-blue-900">
                세션 종료 후 <span className="font-bold">{picked.guardianName}님 ({picked.guardianRelation})</span>용 리포트가 생성됩니다. 관리자 검토 후 발송 여부를 결정하세요.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
