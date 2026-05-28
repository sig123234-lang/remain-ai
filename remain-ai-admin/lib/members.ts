import type { CognitiveLevel } from './live-sessions';

export type AliveStatus = 'alive' | 'deceased' | 'unknown';

export interface FamilyStatus {
  father: AliveStatus;
  mother: AliveStatus;
  spouse: AliveStatus;
}

export interface ConsentStatus {
  L1: boolean;
  L2: boolean;
  L3: boolean;
  L4: boolean;
  L5: boolean;
  L6: boolean;
}

export interface Member {
  id: string;
  name: string;
  age: number;
  cognitiveLevel: CognitiveLevel;
  facility: string;
  sessionCount: number;
  lastSessionAt?: string;
  inActiveSession?: boolean;
  guardianName?: string;
  guardianRelation?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  kakaoChannelLinked?: boolean;
  familyStatus?: FamilyStatus;
  tabooTopics?: string[];
  consent?: ConsentStatus;
  registeredAt?: string;
}

export const GUARDIAN_RELATIONS = ['아들', '딸', '며느리', '사위', '배우자', '손자', '손녀', '기타'];

export function cognitiveBadge(c: CognitiveLevel): string {
  return ({ normal: '정상', MCI: 'MCI', moderate: '중등도' } as const)[c];
}

export function timeAgoKo(iso?: string): string {
  if (!iso) return '없음';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}달 전`;
}
