'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AliveStatus, ConsentStatus, FamilyStatus } from '@/lib/members';
import { GUARDIAN_RELATIONS } from '@/lib/members';
import type { CognitiveLevel } from '@/lib/live-sessions';
import type { Facility } from '@/lib/facilities';

export interface NewMemberInput {
  name: string;
  age: number;
  cognitiveLevel: CognitiveLevel;
  facilityId: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone?: string;
  guardianEmail?: string;
  kakaoChannelLinked: boolean;
  familyStatus: FamilyStatus;
  tabooTopics: string[];
  consent: ConsentStatus;
}

export interface NewMemberSubmitResult {
  ok: boolean;
  error?: string;
}

interface FormState {
  name: string;
  age: string;
  cognitiveLevel: CognitiveLevel;
  facilityId: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  kakaoChannelLinked: boolean;
  family: FamilyStatus;
  taboo: string;
  consent: ConsentStatus;
}

function makeInitialForm(defaultFacilityId: string): FormState {
  return {
    name: '',
    age: '',
    cognitiveLevel: 'normal',
    facilityId: defaultFacilityId,
    guardianName: '',
    guardianRelation: GUARDIAN_RELATIONS[0],
    guardianPhone: '',
    guardianEmail: '',
    kakaoChannelLinked: false,
    family: { father: 'unknown', mother: 'unknown', spouse: 'unknown' },
    taboo: '',
    consent: { L1: true, L2: true, L3: true, L4: false, L5: true, L6: false },
  };
}

// ─────────────────────────────────────────────
//  하위 UI 요소
// ─────────────────────────────────────────────
function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] font-semibold text-slate-500 mb-1.5 dark:text-slate-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';

function AliveRadios({
  value,
  onChange,
}: {
  value: AliveStatus;
  onChange: (v: AliveStatus) => void;
}) {
  const opts: { v: AliveStatus; label: string }[] = [
    { v: 'alive', label: '생존' },
    { v: 'deceased', label: '사망' },
    { v: 'unknown', label: '모름' },
  ];
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 dark:bg-slate-800">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`
            flex-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition
            ${value === o.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
          `}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`inline-flex items-center w-10 h-6 rounded-full transition-colors ${on ? 'bg-slate-900' : 'bg-slate-200'}`}
    >
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

// ─────────────────────────────────────────────
//  메인
// ─────────────────────────────────────────────
export default function NewMemberDrawer({
  open,
  onClose,
  onSubmit,
  facilities,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewMemberInput) => Promise<NewMemberSubmitResult>;
  facilities: Facility[];
}) {
  const defaultFacilityId = facilities[0]?.id ?? '';
  const [form, setForm] = useState<FormState>(() => makeInitialForm(defaultFacilityId));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 상태 초기화는 open 전이 시에만 — onClose/defaultFacilityId 변경으로 form이 날아가지 않게
  useEffect(() => {
    if (!open) return;
    setForm(makeInitialForm(defaultFacilityId));
    setError(null);
    setSubmitting(false);
    // defaultFacilityId는 첫 진입 시점 값만 사용 — 그 후 부모 polling으로 바뀌어도 무시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC 닫기는 onClose 갱신 따라가도 무방
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function validate(): string | null {
    if (!form.name.trim()) return '이름을 입력해 주세요.';
    const ageNum = Number(form.age);
    if (!ageNum || ageNum < 20 || ageNum > 120) return '나이를 20~120 사이로 입력해 주세요.';
    if (!form.facilityId) return '시설을 선택해 주세요.';
    if (!form.guardianName.trim()) return '보호자 이름을 입력해 주세요.';
    if (!form.consent.L1 || !form.consent.L2 || !form.consent.L3) {
      return '세션 운영을 위해 L1~L3 동의는 필수입니다.';
    }
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const tabooArr = form.taboo
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const input: NewMemberInput = {
      name: form.name.trim(),
      age: Number(form.age),
      cognitiveLevel: form.cognitiveLevel,
      facilityId: form.facilityId,
      guardianName: form.guardianName.trim(),
      guardianRelation: form.guardianRelation,
      guardianPhone: form.guardianPhone.trim() || undefined,
      guardianEmail: form.guardianEmail.trim() || undefined,
      kakaoChannelLinked: form.kakaoChannelLinked,
      familyStatus: form.family,
      tabooTopics: tabooArr,
      consent: form.consent,
    };

    setError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit(input);
      if (!result.ok) {
        setError(result.error ?? '등록 실패');
      }
      // 성공 시 부모가 닫음. 실패면 그대로 두고 에러만 표시.
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록 실패');
    } finally {
      setSubmitting(false);
    }
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
        aria-label="새 회원님 등록"
        className="
 fixed top-0 right-0 bottom-0 z-50
 w-full sm:w-[520px] max-w-[100vw]
 bg-white shadow-2xl
 flex flex-col
 animate-fade-in-up
 overflow-hidden
 "
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 dark:border-slate-800">
          <div>
            <div className="text-[18px] font-bold text-slate-900 tracking-tight dark:text-slate-100">새 회원님 등록</div>
            <div className="text-[12px] text-slate-400 mt-0.5 dark:text-slate-500">필수 항목을 채우면 즉시 등록됩니다.</div>
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
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* 기본 정보 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3 dark:text-slate-500">기본 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldLabel required>이름</FieldLabel>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="예: 이화상"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <FieldLabel required>나이</FieldLabel>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="82"
                  min={20}
                  max={120}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel required>인지 수준</FieldLabel>
                <select
                  value={form.cognitiveLevel}
                  onChange={(e) => setForm({ ...form, cognitiveLevel: e.target.value as CognitiveLevel })}
                  className={inputCls}
                >
                  <option value="normal">정상</option>
                  <option value="MCI">MCI</option>
                  <option value="moderate">중등도</option>
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel required>시설</FieldLabel>
                {facilities.length === 0 ? (
                  <div className="px-3 py-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-[12px] text-amber-800">
                    등록된 시설이 없어요. 먼저 <Link href="/facilities" className="font-semibold underline">시설 관리</Link>에서 등록해 주세요.
                  </div>
                ) : (
                  <select
                    value={form.facilityId}
                    onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                    className={inputCls}
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </section>

          {/* 보호자 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3 dark:text-slate-500">보호자</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>이름</FieldLabel>
                <input
                  type="text"
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                  placeholder="예: 민수"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel required>관계</FieldLabel>
                <select
                  value={form.guardianRelation}
                  onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}
                  className={inputCls}
                >
                  {GUARDIAN_RELATIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel>휴대폰</FieldLabel>
                <input
                  type="tel"
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                  placeholder="010-0000-0000"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel>이메일</FieldLabel>
                <input
                  type="email"
                  value={form.guardianEmail}
                  onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                  placeholder="optional@example.com"
                  className={inputCls}
                />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.kakaoChannelLinked}
                onChange={(e) => setForm({ ...form, kakaoChannelLinked: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 dark:text-slate-100"
              />
              <span className="text-[12px] text-slate-700 dark:text-slate-300">remAIn 카카오 채널 친구로 추가됨</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">(이미지 포함 친구톡 가능)</span>
            </label>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              리포트 발송 대상이 됩니다. 휴대폰은 카카오 알림톡 / SMS, 이메일은 이메일 발송에 사용됩니다.
            </p>
          </section>

          {/* 가족 상태 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3 dark:text-slate-500">
              가족 생존 상태
            </div>
            <p className="text-[11px] text-slate-400 mb-3 dark:text-slate-500">
              사망 부모에게 현재형 질문을 하지 않도록 LLM이 참조합니다 (절대 규칙 #6).
            </p>
            <div className="space-y-3">
              {([
                { key: 'father', label: '아버지' },
                { key: 'mother', label: '어머니' },
                { key: 'spouse', label: '배우자' },
              ] as const).map((row) => (
                <div key={row.key} className="grid grid-cols-3 items-center gap-3">
                  <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{row.label}</div>
                  <div className="col-span-2">
                    <AliveRadios
                      value={form.family[row.key]}
                      onChange={(v) => setForm({ ...form, family: { ...form.family, [row.key]: v } })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 회피 주제 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3 dark:text-slate-500">
              회피할 주제 <span className="font-normal text-slate-300">(선택)</span>
            </div>
            <textarea
              value={form.taboo}
              onChange={(e) => setForm({ ...form, taboo: e.target.value })}
              placeholder="쉼표로 구분해 입력 — 예: 첫째 아들 사고, 군대 시절"
              rows={2}
              className={inputCls + ' resize-none'}
            />
          </section>

          {/* 동의 */}
          <section>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3 dark:text-slate-500">
              동의 (consentStatus)
            </div>
            <ul className="divide-y divide-slate-100 -mt-2 dark:divide-slate-800">
              {([
                { id: 'L1', name: 'L1 — 세션 진행', desc: '대화 진행 기본 동의', required: true },
                { id: 'L2', name: 'L2 — 음성 처리', desc: 'STT 변환·처리', required: true },
                { id: 'L3', name: 'L3 — 기록 보관', desc: '대화 로그 저장', required: true },
                { id: 'L4', name: 'L4 — AI 학습', desc: '익명화 데이터 사용', required: false },
                { id: 'L5', name: 'L5 — 보호자 공유', desc: '리포트 전달', required: false },
                { id: 'L6', name: 'L6 — 외부 연구', desc: '제3자 제공', required: false },
              ] as const).map((l) => (
                <li key={l.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 flex items-center gap-2 dark:text-slate-200">
                      {l.name}
                      {l.required && <span className="text-[10px] text-red-500 font-bold">필수</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 dark:text-slate-500">{l.desc}</div>
                  </div>
                  <Toggle
                    on={form.consent[l.id]}
                    onChange={(v) => setForm({ ...form, consent: { ...form.consent, [l.id]: v } })}
                  />
                </li>
              ))}
            </ul>
          </section>

        </div>

        {/* 액션 바 (하단 고정) — 에러 메시지는 여기에 sticky로 노출 */}
        <div className="border-t border-slate-100 bg-white dark:border-slate-800">
          {error && (
            <div className="mx-5 mt-3 rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[12px] text-red-700 flex items-start gap-2 animate-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <div className="px-5 py-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60 transition dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 transition"
              >
                {submitting ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
