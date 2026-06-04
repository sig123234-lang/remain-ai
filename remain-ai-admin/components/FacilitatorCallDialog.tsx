'use client';

import { useEffect, useState } from 'react';
import {
  REASON_OPTIONS,
  type FacilitatorCallReason,
} from '@/lib/facilitator-calls';

export default function FacilitatorCallDialog({
  open,
  onClose,
  onSubmit,
  presetReason,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: FacilitatorCallReason, note: string) => void;
  /** 위기 알림 카드에서 호출 시 — 자동 선택할 사유 */
  presetReason?: FacilitatorCallReason;
}) {
  const [reason, setReason] = useState<FacilitatorCallReason>(presetReason ?? 'silence');
  const [note, setNote] = useState('');

  // open 전이 시에만 form 초기화 — 부모 polling으로 인한 onClose 새 인스턴스에 휘둘리지 않음
  useEffect(() => {
    if (!open) return;
    setReason(presetReason ?? 'silence');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit() {
    onSubmit(reason, note.trim());
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
        aria-label="진행자 호출"
        className="
 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
 w-[92vw] max-w-[480px]
 max-h-[88vh]
 bg-white rounded-2xl shadow-2xl
 flex flex-col overflow-hidden
 animate-fade-in-up
 "
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 dark:border-slate-800">
          <div>
            <div className="text-[16px] font-bold text-slate-900 tracking-tight dark:text-slate-100">진행자 호출</div>
            <div className="text-[12px] text-slate-400 mt-0.5 dark:text-slate-500">
              현장 진행자에게 즉시 알림이 발송됩니다
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

        {/* 본문 — 사유 선택 + 메모 */}
        <div className="px-5 py-5 overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">
            호출 사유
          </div>
          <ul className="space-y-1.5 mb-5">
            {REASON_OPTIONS.map((r) => {
              const selected = reason === r.id;
              const toneRing = selected
                ? r.tone === 'critical'
                  ? 'ring-red-300 bg-red-50'
                  : r.tone === 'warning'
                  ? 'ring-amber-300 bg-amber-50'
                  : 'ring-slate-300 bg-slate-50'
                : 'ring-slate-100 hover:bg-slate-50';
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setReason(r.id)}
                    aria-pressed={selected}
                    className={`
                      w-full text-left
                      flex items-start gap-3
                      px-3 py-2.5 rounded-xl ring-1 ring-inset
                      transition
                      ${toneRing}
                    `}
                  >
                    <span
                      className={`
                        mt-0.5 grid place-items-center w-4 h-4 rounded-full ring-1
                        ${selected
                          ? r.tone === 'critical' ? 'bg-red-600 ring-red-600' : r.tone === 'warning' ? 'bg-amber-500 ring-amber-500' : 'bg-slate-900 ring-slate-900'
                          : 'bg-white ring-slate-300'}
                      `}
                      aria-hidden
                    >
                      {selected && <span className="block w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-[13px] font-semibold ${selected ? (r.tone === 'critical' ? 'text-red-800' : r.tone === 'warning' ? 'text-amber-800' : 'text-slate-900') : 'text-slate-800'}`}>
                        {r.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">{r.desc}</div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">
            메모 <span className="font-normal text-slate-300">(선택)</span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 회원님 호흡이 가빠짐. 잠시 동석 필요."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none dark:text-slate-200 dark:bg-slate-800/50 dark:ring-slate-800 dark:placeholder:text-slate-500"
          />
        </div>

        {/* 액션 */}
        <div className="border-t border-slate-100 px-5 py-3 grid grid-cols-2 gap-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-[13px] font-semibold hover:bg-amber-700 active:scale-[0.99] transition"
          >
            지금 호출
          </button>
        </div>
      </div>
    </>
  );
}
