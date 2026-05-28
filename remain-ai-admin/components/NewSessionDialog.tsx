'use client';

import { useEffect, useMemo, useState } from 'react';
import { type Member, cognitiveBadge, timeAgoKo } from '@/lib/members';
import { Pill } from './Card';

type Step = 'pick' | 'link';

function generateSessionId(): string {
  // 백엔드 연결 전 임시 ID — 실제로는 서버에서 토큰 발급
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `s_${ts}${rand}`;
}

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
  const [linkCopied, setLinkCopied] = useState(false);

  // open 시 초기화 + ESC 닫기
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setQuery('');
    setPicked(null);
    setSessionId('');
    setLinkCopied(false);
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

  function handlePick(m: Member) {
    setPicked(m);
    setSessionId(generateSessionId());
    setStep('link');
  }

  const link = picked ? `${typeof window !== 'undefined' ? window.location.origin : ''}/session/${sessionId}` : '';

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
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-[16px] font-bold text-slate-900 tracking-tight">
              {step === 'pick' ? '새 대화 시작' : '대화 링크 준비됨'}
            </div>
            <div className="text-[12px] text-slate-400 mt-0.5">
              {step === 'pick'
                ? '대화할 회원님을 선택하면 고유 링크가 만들어져요'
                : '이 링크로 접속하면 바로 대화가 시작돼요'}
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

        {/* STEP 1: 회원 선택 */}
        {step === 'pick' && (
          <>
            <div className="px-5 pt-4 pb-3">
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
                  focus:outline-none focus:ring-2 focus:ring-slate-300
                "
              />
              <div className="mt-2 text-[11px] text-slate-400">
                총 {filtered.length}명 · 진행 중 표시된 회원님은 새 세션 시작 시 기존 세션 종료
              </div>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 pb-3">
              {filtered.length === 0 ? (
                <li className="text-center text-[13px] text-slate-400 py-10">검색 결과가 없어요</li>
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
                        transition
                      "
                    >
                      <div className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-slate-900">{m.name}</span>
                          <span className="text-[12px] text-slate-400">{m.age}세</span>
                          {m.inActiveSession && <Pill tone="success">진행 중</Pill>}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {cognitiveBadge(m.cognitiveLevel)} · {m.facility} · {m.sessionCount}회차 · 마지막 {timeAgoKo(m.lastSessionAt)}
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" aria-hidden>
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
            <div className="rounded-xl bg-slate-50 p-4 flex items-center gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-[14px] font-bold shrink-0">
                {picked.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-slate-900">
                  {picked.name} <span className="font-normal text-slate-500">{picked.age}세</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {cognitiveBadge(picked.cognitiveLevel)} · {picked.facility} · {picked.sessionCount + 1}회차로 시작
                </div>
              </div>
              <button
                onClick={() => setStep('pick')}
                className="ml-auto shrink-0 px-2.5 py-1.5 rounded-lg bg-white ring-1 ring-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                변경
              </button>
            </div>

            {/* 링크 박스 */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">대화 링크</div>
              <div className="rounded-xl bg-slate-900 text-white p-4 font-mono text-[12px] break-all leading-relaxed">
                {link}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                <span>만료: 30분 후</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                <span>1회용</span>
              </div>
            </div>

            {/* 액션 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
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
                className="
                  px-4 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-semibold
                  hover:bg-slate-800 active:scale-[0.99]
                  flex items-center justify-center gap-2 transition
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
