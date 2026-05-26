/**
 * 어르신 회원 목록 mock.
 * 실제로는 Supabase에서 시설별 권한에 맞춰 로드.
 */

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
  sessionCount: number;       // 누적 세션 횟수
  lastSessionAt?: string;     // ISO
  inActiveSession?: boolean;  // 현재 진행 중이면 true
  guardianName?: string;
  guardianRelation?: string;
  familyStatus?: FamilyStatus;
  tabooTopics?: string[];
  consent?: ConsentStatus;
  registeredAt?: string;      // ISO
}

export const FACILITIES = [
  '한울요양원 A동',
  '한울요양원 B동',
  '한빛노인복지센터',
];

export const GUARDIAN_RELATIONS = ['아들', '딸', '며느리', '사위', '배우자', '손자', '손녀', '기타'];

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

export const MOCK_MEMBERS: Member[] = [
  { id: 'M-001', name: '이화상', age: 82, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 3, lastSessionAt: daysAgo(2),  inActiveSession: true,  guardianName: '민수', guardianRelation: '아들' },
  { id: 'M-002', name: '박순자', age: 78, cognitiveLevel: 'MCI',      facility: '한울요양원 B동',     sessionCount: 1, lastSessionAt: daysAgo(5),  inActiveSession: true,  guardianName: '지영', guardianRelation: '딸' },
  { id: 'M-003', name: '김영자', age: 89, cognitiveLevel: 'normal',   facility: '한빛노인복지센터',   sessionCount: 7, lastSessionAt: daysAgo(1),  inActiveSession: true,  guardianName: '윤재', guardianRelation: '아들' },
  { id: 'M-004', name: '최정훈', age: 73, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 2, lastSessionAt: daysAgo(4),  inActiveSession: true,  guardianName: '예린', guardianRelation: '딸' },
  { id: 'M-005', name: '정명숙', age: 85, cognitiveLevel: 'normal',   facility: '한울요양원 B동',     sessionCount: 5, lastSessionAt: daysAgo(3),  inActiveSession: true,  guardianName: '도현', guardianRelation: '아들' },
  { id: 'M-006', name: '김태수', age: 80, cognitiveLevel: 'MCI',      facility: '한빛노인복지센터',   sessionCount: 4, lastSessionAt: daysAgo(2),  inActiveSession: true,  guardianName: '서영', guardianRelation: '며느리' },
  { id: 'M-007', name: '윤옥분', age: 77, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 6, lastSessionAt: daysAgo(1),  inActiveSession: true,  guardianName: '민지', guardianRelation: '손녀' },
  { id: 'M-008', name: '강신애', age: 84, cognitiveLevel: 'normal',   facility: '한울요양원 B동',     sessionCount: 1, lastSessionAt: daysAgo(7),  inActiveSession: true,  guardianName: '준호', guardianRelation: '아들' },
  { id: 'M-009', name: '송미옥', age: 76, cognitiveLevel: 'normal',   facility: '한빛노인복지센터',   sessionCount: 8, lastSessionAt: daysAgo(0),  inActiveSession: true,  guardianName: '하늘', guardianRelation: '딸' },
  { id: 'M-010', name: '한경수', age: 81, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 2, lastSessionAt: daysAgo(0),  inActiveSession: true,  guardianName: '재민', guardianRelation: '아들' },
  // 진행 중이 아닌 회원들 (대화 시작 가능)
  { id: 'M-011', name: '오순임', age: 79, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 4, lastSessionAt: daysAgo(2) },
  { id: 'M-012', name: '권만식', age: 83, cognitiveLevel: 'MCI',      facility: '한울요양원 B동',     sessionCount: 2, lastSessionAt: daysAgo(6) },
  { id: 'M-013', name: '백명자', age: 87, cognitiveLevel: 'normal',   facility: '한빛노인복지센터',   sessionCount: 9, lastSessionAt: daysAgo(1) },
  { id: 'M-014', name: '서태준', age: 75, cognitiveLevel: 'normal',   facility: '한울요양원 A동',     sessionCount: 0 },
  { id: 'M-015', name: '문정애', age: 81, cognitiveLevel: 'moderate', facility: '한빛노인복지센터',   sessionCount: 3, lastSessionAt: daysAgo(4) },
  { id: 'M-016', name: '조영식', age: 86, cognitiveLevel: 'normal',   facility: '한울요양원 B동',     sessionCount: 5, lastSessionAt: daysAgo(3) },
];

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
