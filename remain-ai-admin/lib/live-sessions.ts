/**
 * 실시간 세션 데이터 타입.
 * 백엔드 연결 전 단계 — 실제 데이터는 sessions/conversation_turns 테이블에서 옴.
 */

export type CognitiveLevel = 'normal' | 'MCI' | 'moderate';
export type SessionPhase = 'main' | 'wrapup' | 'force_end' | 'post_processing';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AlertLevel = 'A' | 'B' | 'C';

export interface LiveSessionAlert {
  level: AlertLevel;
  kind: string;       // 자해 언급 / 타인 위협 / 구체적 자해 계획 등
  detectedAt: string; // ISO
}

export interface RecentUtterance {
  role: 'ai' | 'elderly';
  text: string;
  at: string; // ISO
}

export interface MentionedPerson {
  name: string;
  relation: string;
  aliveStatus: 'alive' | 'deceased' | 'unknown';
}
export interface MentionedPlace {
  name: string;
  period?: string;
}

export interface LiveSession {
  id: string;
  elderly: {
    name: string;
    age: number;
    cognitiveLevel: CognitiveLevel;
    sessionNumber: number;
  };
  facility: string;
  startedAt: string;
  elapsedMinutes: number;
  turnCount: number;
  hardCapTurns: number;
  hardCapMinutes: number;
  sessionPhase: SessionPhase;
  depthLevel: 1 | 2 | 3 | 4;
  riskLevel: RiskLevel;
  consecutiveRefusals: number;
  treasureDetected: boolean;
  currentTopic: string | null;
  currentScene: string | null;
  alerts: LiveSessionAlert[];
  ruleViolationsActive: number;
  recent?: RecentUtterance;
  /** 청취 페이지용 — 최근 6~10턴 (실제로는 백엔드에서 스트림) */
  recentTurns?: RecentUtterance[];
  /** 누적 엔티티 */
  mentionedPeople?: MentionedPerson[];
  mentionedPlaces?: MentionedPlace[];
  mentionedTimeperiods?: string[];
  /** 현재 발화 중인 측 — 청취 페이지의 라이브 인디케이터용 */
  speakingNow?: 'ai' | 'elderly' | 'silence';
}

export function findSessionById(_id: string): LiveSession | undefined {
  // 백엔드 연결 전 — 항상 undefined. 추후 sessions 테이블 조회로 대체.
  return undefined;
}

// ─────────────────────────────────────────────
//  트리아지 점수 (높을수록 위급)
// ─────────────────────────────────────────────
export function triageScore(s: LiveSession): number {
  let score = 0;
  // Level C/B/A
  for (const a of s.alerts) {
    score += a.level === 'C' ? 1000 : a.level === 'B' ? 500 : 100;
  }
  // 활성 규칙 위반
  score += s.ruleViolationsActive * 80;
  // 위험도
  score += s.riskLevel === 'high' ? 200 : s.riskLevel === 'medium' ? 60 : 0;
  // 연속 거부
  if (s.consecutiveRefusals >= 5) score += 150;
  else if (s.consecutiveRefusals >= 3) score += 60;
  // hard cap 근접 (90%↑)
  const turnRatio = s.turnCount / s.hardCapTurns;
  const timeRatio = s.elapsedMinutes / s.hardCapMinutes;
  if (Math.max(turnRatio, timeRatio) >= 0.9) score += 80;
  // phase 가중
  if (s.sessionPhase === 'force_end') score += 50;
  else if (s.sessionPhase === 'wrapup') score += 20;
  // post_processing은 후순위
  if (s.sessionPhase === 'post_processing') score -= 500;
  return score;
}

export type Tone = 'critical' | 'warning' | 'success' | 'muted' | 'info';

/** 카드 시각 톤 결정 */
export function sessionTone(s: LiveSession): Tone {
  if (s.sessionPhase === 'post_processing') return 'muted';
  if (s.alerts.some(a => a.level === 'C')) return 'critical';
  if (s.alerts.some(a => a.level === 'B')) return 'critical';
  if (s.ruleViolationsActive > 0) return 'critical';
  if (s.riskLevel === 'high') return 'critical';
  if (s.riskLevel === 'medium') return 'warning';
  if (s.consecutiveRefusals >= 3) return 'warning';
  const turnRatio = s.turnCount / s.hardCapTurns;
  const timeRatio = s.elapsedMinutes / s.hardCapMinutes;
  if (Math.max(turnRatio, timeRatio) >= 0.9) return 'warning';
  return 'success';
}

export function phaseLabel(p: SessionPhase): string {
  return ({
    main: '진행 중',
    wrapup: '마무리 중',
    force_end: '자동 종료',
    post_processing: '정리 중',
  } as const)[p];
}
export function cognitiveLabel(c: CognitiveLevel): string {
  return ({ normal: '정상', MCI: 'MCI', moderate: '중등도' } as const)[c];
}

// ─────────────────────────────────────────────
//  직원용 자연어 워딩 — 내부 코드를 사용자 친화 한국어로
// ─────────────────────────────────────────────

/** risk: high/medium/low → 위험/주의/안정 */
export function riskLabel(r: RiskLevel): string {
  return ({ low: '안정', medium: '주의', high: '위험' } as const)[r];
}

/** depth L1~L4 → 사실/디테일/감정/깊은 마음 */
export function depthLabel(d: 1 | 2 | 3 | 4): string {
  return ({ 1: '사실', 2: '디테일', 3: '감정', 4: '깊은 마음' } as const)[d];
}

/** Level A/B/C → 관찰/주의/긴급 */
export function alertLevelLabel(a: AlertLevel): string {
  return ({ A: '관찰', B: '주의', C: '긴급' } as const)[a];
}

/** alive 상태 → 생존/작고하심/미확인 */
export function aliveLabel(s: 'alive' | 'deceased' | 'unknown'): string {
  return ({ alive: '생존', deceased: '작고하심', unknown: '미확인' } as const)[s];
}

