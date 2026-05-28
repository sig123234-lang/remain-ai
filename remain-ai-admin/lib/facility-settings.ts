// 시설 단위 기본값 — 동의(L1~L6) + 알림 자동화.
// 마이그레이션 0005에서 facilities 테이블에 jsonb로 저장됨.

export type ConsentKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
export const CONSENT_KEYS: ConsentKey[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

export type ConsentDefaults = Record<ConsentKey, boolean>;

export const DEFAULT_CONSENT: ConsentDefaults = {
  L1: true,
  L2: true,
  L3: true,
  L4: false,
  L5: true,
  L6: false,
};

export type NotificationPrefKey =
  | 'crisisEmail'
  | 'autoSendReport'
  | 'weeklyDigest'
  | 'ruleViolationDigest';

export const NOTIFICATION_PREF_KEYS: NotificationPrefKey[] = [
  'crisisEmail',
  'autoSendReport',
  'weeklyDigest',
  'ruleViolationDigest',
];

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  crisisEmail: true,
  autoSendReport: false,
  weeklyDigest: false,
  ruleViolationDigest: true,
};

// jsonb는 임의 형태로 올 수 있으니 모든 키를 안전하게 기본값으로 채움.
export function parseConsent(raw: unknown): ConsentDefaults {
  const out: ConsentDefaults = { ...DEFAULT_CONSENT };
  if (raw && typeof raw === 'object') {
    for (const k of CONSENT_KEYS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'boolean') out[k] = v;
    }
  }
  return out;
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const out: NotificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS };
  if (raw && typeof raw === 'object') {
    for (const k of NOTIFICATION_PREF_KEYS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === 'boolean') out[k] = v;
    }
  }
  return out;
}

// 화면 표시용 메타 — 페이지/컴포넌트 양쪽에서 공유.
export const CONSENT_META: Record<ConsentKey, { name: string; desc: string }> = {
  L1: { name: 'L1 — 세션 진행',   desc: '대화 진행을 위한 기본 동의' },
  L2: { name: 'L2 — 음성 처리',   desc: 'STT 변환 및 처리 동의' },
  L3: { name: 'L3 — 기록 보관',   desc: '대화 로그·메타데이터 저장' },
  L4: { name: 'L4 — AI 학습',     desc: '익명화된 데이터 모델 개선 사용' },
  L5: { name: 'L5 — 보호자 공유', desc: '리포트 형태로 가족에게 전달' },
  L6: { name: 'L6 — 외부 연구',   desc: '제3자 연구 기관 제공 (선택)' },
};

export const NOTIFICATION_META: Record<NotificationPrefKey, { label: string; desc: string }> = {
  crisisEmail:          { label: '위기 알림 즉시 이메일',     desc: '긴급·주의 신호 감지 시' },
  autoSendReport:       { label: '보호자 리포트 자동 발송',   desc: '꺼두면 관리자 검토 후 수동 발송 (권장)' },
  weeklyDigest:         { label: '주간 운영 요약',            desc: '매주 월요일 09:00 발송' },
  ruleViolationDigest:  { label: '규칙 위반 일일 다이제스트', desc: '하루 1회 관리자 메일' },
};
