/**
 * 회원 세션 아카이브 — 종료된 세션의 전체 대화 로그 + 음성 메타.
 *
 * 보관 정책:
 *  - L2(음성 처리) + L3(기록 보관) 동의 시: 텍스트 + 음성 보관
 *  - L3만 동의: 텍스트만 보관, audio.stored = false
 *  - L3 미동의: 아카이브 자체 없음
 *
 * 백엔드 연결 전 — 모든 finder는 빈 결과 반환. 추후 sessions/conversation_turns/audio_files
 * 테이블 조회로 대체 예정.
 */

export type ArchiveRole = 'ai' | 'elderly';

export interface ArchivedTurn {
  index: number;
  role: ArchiveRole;
  text: string;
  /** 세션 시작부터의 누적 초 (음성 점프용) */
  timestampSec: number;
  /** 발화 길이 (초) */
  durationSec?: number;
  /** STT 신뢰도 (어르신만) */
  sttConfidence?: number;
}

export interface ArchivedAudio {
  /** 동의 기반 보관 여부 — false면 텍스트만 있음 */
  stored: boolean;
  /** 파일 URL — 실제로는 Supabase Storage signed URL */
  url?: string;
  format: 'webm' | 'mp3' | 'm4a';
  durationSec: number;
  sizeBytes: number;
  /** 채널 수 (1=mono, 2=stereo) */
  channels: 1 | 2;
  sampleRateHz: number;
}

export interface ArchivedSession {
  id: string;
  memberId: string;
  sessionNumber: number;
  startedAt: string;          // ISO
  endedAt: string;
  durationMinutes: number;
  turnCount: number;
  // 메타
  mainTopic: string;
  topics: string[];
  emotionalScore: number;     // 0~100
  treasureDetected: boolean;
  riskFlagged: boolean;       // 위기 신호가 있었는지
  // 전체 대화
  turns: ArchivedTurn[];
  // 음성
  audio: ArchivedAudio;
  // 연결된 보호자 리포트
  reportId?: string;
}

// ─────────────────────────────────────────────
//  헬퍼
// ─────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${String(s).padStart(2, '0')}초`;
}
export function secToMmss(sec: number): string {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec) % 60).padStart(2, '0')}`;
}

export function findSessionsByMember(_memberId: string): ArchivedSession[] {
  return [];
}
export function findArchivedSessionById(_id: string): ArchivedSession | undefined {
  return undefined;
}
