/**
 * 실시간 세션 데이터 타입 + mock.
 * 백엔드 연결 전까지 UI 데모용 목업을 제공한다.
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
  return ({ main: '진행', wrapup: '마무리', force_end: '강제종료', post_processing: '후처리' } as const)[p];
}
export function cognitiveLabel(c: CognitiveLevel): string {
  return ({ normal: '정상', MCI: 'MCI', moderate: '중등도' } as const)[c];
}

// ─────────────────────────────────────────────
//  MOCK — UI 데모용 (백엔드 연결 시 제거 / 대체)
// ─────────────────────────────────────────────
const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const MOCK_LIVE_SESSIONS: LiveSession[] = [
  {
    id: 'S-001',
    elderly: { name: '이화상', age: 82, cognitiveLevel: 'normal', sessionNumber: 3 },
    facility: '한울요양원 A동',
    startedAt: minsAgo(17),
    elapsedMinutes: 17,
    turnCount: 14,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'main',
    depthLevel: 3,
    riskLevel: 'high',
    consecutiveRefusals: 0,
    treasureDetected: true,
    currentTopic: '아버지 — 어린 시절 식사',
    currentScene: 'childhood_home_dinner',
    alerts: [{ level: 'B', kind: '자해 관련 발언 1회', detectedAt: minsAgo(2) }],
    ruleViolationsActive: 0,
    recent: { role: 'elderly', text: '요즘은 그냥 빨리 갔으면 좋겠다는 생각이 들어.', at: minsAgo(2) },
  },
  {
    id: 'S-002',
    elderly: { name: '박순자', age: 78, cognitiveLevel: 'MCI', sessionNumber: 1 },
    facility: '한울요양원 B동',
    startedAt: minsAgo(11),
    elapsedMinutes: 11,
    turnCount: 8,
    hardCapTurns: 18,
    hardCapMinutes: 25,
    sessionPhase: 'main',
    depthLevel: 2,
    riskLevel: 'medium',
    consecutiveRefusals: 2,
    treasureDetected: false,
    currentTopic: '학교 — 통학길',
    currentScene: 'school_walk',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'elderly', text: '글쎄… 잘 기억이 안 나네.', at: minsAgo(1) },
  },
  {
    id: 'S-003',
    elderly: { name: '김영자', age: 89, cognitiveLevel: 'normal', sessionNumber: 7 },
    facility: '한빛노인복지센터',
    startedAt: minsAgo(28),
    elapsedMinutes: 28,
    turnCount: 24,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'wrapup',
    depthLevel: 4,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: true,
    currentTopic: '결혼 — 신혼',
    currentScene: 'wedding_day',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'ai', text: '오늘 좋은 이야기 들려주셔서 감사해요.', at: minsAgo(1) },
  },
  {
    id: 'S-004',
    elderly: { name: '최정훈', age: 73, cognitiveLevel: 'normal', sessionNumber: 2 },
    facility: '한울요양원 A동',
    startedAt: minsAgo(3),
    elapsedMinutes: 3,
    turnCount: 3,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'main',
    depthLevel: 1,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: false,
    currentTopic: '어린 시절',
    currentScene: 'opening',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'ai', text: '이맘때쯤 되면 어릴 때 뭐 하셨어요?', at: minsAgo(1) },
  },
  {
    id: 'S-005',
    elderly: { name: '정명숙', age: 85, cognitiveLevel: 'normal', sessionNumber: 5 },
    facility: '한울요양원 B동',
    startedAt: minsAgo(14),
    elapsedMinutes: 14,
    turnCount: 12,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'main',
    depthLevel: 2,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: true,
    currentTopic: '시장 — 단골 반찬',
    currentScene: 'market_visit',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'elderly', text: '거기서만 그 맛이 나더라고. 아직도 그게 떠오르지.', at: minsAgo(1) },
  },
  {
    id: 'S-006',
    elderly: { name: '김태수', age: 80, cognitiveLevel: 'MCI', sessionNumber: 4 },
    facility: '한빛노인복지센터',
    startedAt: minsAgo(9),
    elapsedMinutes: 9,
    turnCount: 7,
    hardCapTurns: 18,
    hardCapMinutes: 25,
    sessionPhase: 'main',
    depthLevel: 2,
    riskLevel: 'low',
    consecutiveRefusals: 1,
    treasureDetected: false,
    currentTopic: '첫 직장',
    currentScene: 'first_job',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'ai', text: '그때 같이 일하던 분 중에 가장 자주 만나신 분은 누구셨어요?', at: minsAgo(1) },
  },
  {
    id: 'S-007',
    elderly: { name: '윤옥분', age: 77, cognitiveLevel: 'normal', sessionNumber: 6 },
    facility: '한울요양원 A동',
    startedAt: minsAgo(22),
    elapsedMinutes: 22,
    turnCount: 18,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'main',
    depthLevel: 3,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: true,
    currentTopic: '자녀 — 첫째 아들',
    currentScene: 'child_birth',
    alerts: [],
    ruleViolationsActive: 1, // #6 위반 1건 발생
    recent: { role: 'ai', text: '아드님 이야기 더 해주시겠어요?', at: minsAgo(1) },
  },
  {
    id: 'S-008',
    elderly: { name: '강신애', age: 84, cognitiveLevel: 'normal', sessionNumber: 1 },
    facility: '한울요양원 B동',
    startedAt: minsAgo(6),
    elapsedMinutes: 6,
    turnCount: 5,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'main',
    depthLevel: 1,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: false,
    currentTopic: '오프닝',
    currentScene: 'opening',
    alerts: [],
    ruleViolationsActive: 0,
    recent: { role: 'elderly', text: '날씨가 좋네요. 봄이 가까운가봐.', at: minsAgo(1) },
  },
  {
    id: 'S-009',
    elderly: { name: '송미옥', age: 76, cognitiveLevel: 'normal', sessionNumber: 8 },
    facility: '한빛노인복지센터',
    startedAt: minsAgo(35),
    elapsedMinutes: 26,
    turnCount: 22,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'post_processing',
    depthLevel: 4,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: true,
    currentTopic: '— 종료 —',
    currentScene: null,
    alerts: [],
    ruleViolationsActive: 0,
  },
  {
    id: 'S-010',
    elderly: { name: '한경수', age: 81, cognitiveLevel: 'normal', sessionNumber: 2 },
    facility: '한울요양원 A동',
    startedAt: minsAgo(42),
    elapsedMinutes: 28,
    turnCount: 24,
    hardCapTurns: 25,
    hardCapMinutes: 30,
    sessionPhase: 'post_processing',
    depthLevel: 3,
    riskLevel: 'low',
    consecutiveRefusals: 0,
    treasureDetected: false,
    currentTopic: '— 종료 —',
    currentScene: null,
    alerts: [],
    ruleViolationsActive: 0,
  },
];
