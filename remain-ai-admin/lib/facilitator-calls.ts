/**
 * 진행자 호출 (Facilitator Call) — 안전 폴백 메커니즘 타입/헬퍼.
 *
 * 회상치료 v10의 안전 프로토콜(Level B/C) + 침묵 30초+ 시점에 사용.
 * 어드민이 현장 진행자를 원격 호출하면 응답 시간이 KPI로 추적된다.
 */

export type FacilitatorCallReason =
  | 'level_c'      // 즉시 위기 — 타인 위협 / 구체적 자해 계획
  | 'level_b'      // 위기 신호 1회 — "빨리 죽었으면" 등
  | 'silence'      // 30초+ 침묵, 응답 없음
  | 'condition'    // 컨디션 변화 (피로/혼란)
  | 'tech'         // 기술 문제 (오디오/마이크)
  | 'other';       // 기타 (관리자 메모로 사유 명시)

export type FacilitatorCallStatus =
  | 'pending'      // 호출됨, 응답 대기
  | 'responding'   // 응답 받음, 진행자가 현장으로 이동 중
  | 'arrived'      // 진행자 도착, 케어 중
  | 'resolved'     // 해제, 케어 완료
  | 'cancelled';   // 호출 취소 (잘못 누른 경우)

export interface FacilitatorCall {
  id: string;
  reason: FacilitatorCallReason;
  note?: string;
  status: FacilitatorCallStatus;
  calledAt: string;          // ISO
  respondedAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
  /** 어드민 식별자 — 추후 다중 어드민 운영 시 */
  calledBy?: string;
}

export const REASON_OPTIONS: { id: FacilitatorCallReason; label: string; desc: string; tone: 'critical' | 'warning' | 'default' }[] = [
  { id: 'level_c',   label: '긴급 — 즉시 위기',  desc: '타인 위협 · 구체적 자해 계획', tone: 'critical' },
  { id: 'level_b',   label: '주의 — 위기 신호',  desc: '"죽고 싶다" 등 위기성 발언', tone: 'critical' },
  { id: 'silence',   label: '응답 없음',         desc: '30초 이상 침묵 또는 무반응', tone: 'warning' },
  { id: 'condition', label: '컨디션 변화',       desc: '피로·혼란·울먹임 등 케어 필요', tone: 'warning' },
  { id: 'tech',      label: '기기 문제',         desc: '소리·마이크·기기 이상', tone: 'default' },
  { id: 'other',     label: '기타',              desc: '메모에 사유를 적어 주세요', tone: 'default' },
];

export function reasonLabel(r: FacilitatorCallReason): string {
  return REASON_OPTIONS.find((o) => o.id === r)?.label ?? r;
}

export function statusLabel(s: FacilitatorCallStatus): string {
  return ({
    pending: '응답 대기',
    responding: '현장 이동 중',
    arrived: '현장 도착 — 케어 중',
    resolved: '해제됨',
    cancelled: '취소됨',
  } as const)[s];
}

export function statusTone(s: FacilitatorCallStatus): 'critical' | 'warning' | 'info' | 'success' | 'muted' {
  return ({
    pending: 'warning',
    responding: 'info',
    arrived: 'success',
    resolved: 'muted',
    cancelled: 'muted',
  } as const)[s];
}

/** 두 ISO 시각 사이 초 — b가 없으면 현재 시각 기준 */
export function diffSecs(a: string, b?: string): number {
  const aMs = new Date(a).getTime();
  const bMs = b ? new Date(b).getTime() : Date.now();
  return Math.max(0, Math.floor((bMs - aMs) / 1000));
}

/** 초 → "MM:SS" */
export function secsToMmss(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function newCallId(): string {
  return 'fc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
