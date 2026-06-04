'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader, Pill } from '@/components/Card';
import {
  CONSENT_KEYS,
  CONSENT_META,
  NOTIFICATION_PREF_KEYS,
  NOTIFICATION_META,
  type ConsentDefaults,
  type NotificationPrefs,
} from '@/lib/facility-settings';
import { saveFacilityPrefs } from './actions';

interface Props {
  facilityId: string | null;
  facilityName: string | null;
  initialConsent: ConsentDefaults;
  initialPrefs: NotificationPrefs;
}

function Toggle({
  on,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`
        inline-flex items-center w-10 h-6 rounded-full transition-colors shrink-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${on
          ? 'bg-slate-900 dark:bg-slate-200'
          : 'bg-slate-200 dark:bg-slate-700'
        }
      `}
    >
      <span
        className={`
          block w-5 h-5 rounded-full bg-white dark:bg-slate-50 shadow transition-transform
          ${on ? 'translate-x-[18px]' : 'translate-x-[2px]'}
        `}
      />
    </button>
  );
}

function equalConsent(a: ConsentDefaults, b: ConsentDefaults): boolean {
  return CONSENT_KEYS.every((k) => a[k] === b[k]);
}
function equalPrefs(a: NotificationPrefs, b: NotificationPrefs): boolean {
  return NOTIFICATION_PREF_KEYS.every((k) => a[k] === b[k]);
}

export default function PrefsCardsClient({
  facilityId,
  facilityName,
  initialConsent,
  initialPrefs,
}: Props) {
  const [consent, setConsent] = useState<ConsentDefaults>(initialConsent);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [baselineConsent, setBaselineConsent] = useState(initialConsent);
  const [baselinePrefs, setBaselinePrefs] = useState(initialPrefs);
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  const dirty = !equalConsent(consent, baselineConsent) || !equalPrefs(prefs, baselinePrefs);
  const noFacility = facilityId === null;

  function reset() {
    setConsent(baselineConsent);
    setPrefs(baselinePrefs);
    setStatus({ kind: 'idle' });
  }

  function save() {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      const result = await saveFacilityPrefs({
        defaultConsent: consent,
        notificationPrefs: prefs,
      });
      if (result.ok) {
        setBaselineConsent(consent);
        setBaselinePrefs(prefs);
        setStatus({ kind: 'ok' });
      } else {
        setStatus({ kind: 'error', message: result.error ?? '저장 실패' });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 동의 관리 */}
      <Card>
        <CardHeader
          title="동의 관리 (consentStatus)"
          description="회원님/보호자 동의 레벨 L1~L6 — 데이터 사용 권한 단계"
          action={
            facilityName ? (
              <Pill tone="info">{facilityName}</Pill>
            ) : (
              <Pill tone="warning">시설 미연결</Pill>
            )
          }
        />
        <CardBody>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {CONSENT_KEYS.map((k) => {
              const meta = CONSENT_META[k];
              return (
                <li key={k} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 ">{meta.name}</div>
                    <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{meta.desc}</div>
                  </div>
                  <Toggle
                    on={consent[k]}
                    onChange={(v) => setConsent((prev) => ({ ...prev, [k]: v }))}
                    disabled={noFacility || pending}
                    ariaLabel={meta.name}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[12px] text-slate-400 dark:text-slate-500">
            실제 동의는 회원님·보호자별로 회원 관리에서 개별 설정합니다. 여기는 신규 등록 시 기본값입니다.
          </p>
        </CardBody>
      </Card>

      {/* 알림 / 자동화 */}
      <Card>
        <CardHeader title="알림 / 자동화" />
        <CardBody>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {NOTIFICATION_PREF_KEYS.map((k) => {
              const meta = NOTIFICATION_META[k];
              return (
                <li key={k} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 ">{meta.label}</div>
                    <div className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{meta.desc}</div>
                  </div>
                  <Toggle
                    on={prefs[k]}
                    onChange={(v) => setPrefs((prev) => ({ ...prev, [k]: v }))}
                    disabled={noFacility || pending}
                    ariaLabel={meta.label}
                  />
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {/* 시설 미연결 안내 */}
      {noFacility && (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900/60 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-300">
          <div className="font-semibold mb-0.5">시설이 연결되어 있지 않아요</div>
          <div className="text-[12px]">
            기본값을 저장하려면 먼저 <Link href="/facilities" className="underline font-semibold">시설 관리</Link>에서 시설을 만들고
            프로필에 연결해 주세요. (지금은 변경해도 저장되지 않습니다)
          </div>
        </div>
      )}

      {/* 저장 영역 */}
      <div className="flex items-center justify-end gap-3">
        {status.kind === 'ok' && (
          <span className="text-[13px] text-emerald-700 dark:text-emerald-400 font-semibold">✓ 저장됨</span>
        )}
        {status.kind === 'error' && (
          <span className="text-[13px] text-red-700 dark:text-red-400 font-semibold">✗ {status.message}</span>
        )}
        {dirty && (
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60 transition "
          >
            되돌리기
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending || noFacility}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 text-[14px] font-semibold hover:bg-slate-800 dark:hover:bg-white active:scale-[0.99] disabled:opacity-50 disabled:hover:bg-slate-900 dark:disabled:hover:bg-slate-100 disabled:active:scale-100 transition"
        >
          {pending ? '저장 중…' : '변경사항 저장'}
        </button>
      </div>
    </div>
  );
}
