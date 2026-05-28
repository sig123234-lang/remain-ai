/**
 * 보호자 리포트 — v3 보호자_리포트_생성_프롬프트 스키마 그대로.
 *
 * 정책: 자동 발송 안 함. 세션 종료 후 자동 생성된 리포트를 관리자가
 * 검토하고 수동으로 보호자에게 발송한다.
 */

export type ReportStyle =
  | 'anime_warm'       // 지브리풍 따뜻한 일러스트 (기본)
  | 'watercolor_warm'
  | 'pencil_sketch'
  | 'soft_illustration'
  | 'oil_painting_warm';

export type ReportStatus = 'draft' | 'reviewed' | 'sent';

export type DeliveryChannel = 'kakao_alimtalk' | 'kakao_friendtalk' | 'sms' | 'email' | 'link_copy';

export interface DeliveryRecord {
  channel: DeliveryChannel;
  sentAt: string;            // ISO
  target?: string;           // 발송 대상 (전화번호/이메일 마스킹된 표시용)
  /** mock 단계: 실패한 발송도 기록 가능 */
  status: 'success' | 'failed';
}

export function channelLabel(c: DeliveryChannel): string {
  return ({
    kakao_alimtalk: '카카오 알림톡',
    kakao_friendtalk: '카카오 친구톡',
    sms: 'SMS 문자',
    email: '이메일',
    link_copy: '링크 복사 (직접 전달)',
  } as const)[c];
}

export interface ImpressiveExcerpt {
  context: string;
  elderlyQuote: string;
  significance: string;
  sessionPhase: 'early' | 'mid' | 'late';
}

export interface MemoryImagePrompt {
  /** 보호자에게 보여줄 한국어 묘사 */
  description: string;
  /** 이미지 생성 AI에 전달할 영문 프롬프트 */
  imageGenerationPrompt: string;
  /** 어떤 기억을 기반으로 했는지 */
  sourceMemory: string;
  /** 시각 스타일 */
  style: ReportStyle;
  /** 실제 생성된 이미지 URL — 백엔드 연결 전엔 undefined (mock 그라데이션 표시) */
  imageUrl?: string;
}

export interface GuardianReport {
  id: string;
  /** 회원님 정보 */
  elderlyId: string;
  elderlyName: string;
  age: number;
  facility: string;
  sessionNumber: number;
  sessionDate: string;       // ISO
  durationMinutes: number;
  /** 보호자 정보 */
  guardianName: string;
  guardianRelation: string;
  guardianPhone?: string;
  guardianEmail?: string;
  kakaoChannelLinked?: boolean;
  /** 리포트 메타 */
  generatedAt: string;
  status: ReportStatus;
  sentAt?: string;
  /** 채널별 발송 이력 — 한 리포트가 여러 채널로 발송될 수도 있음 */
  deliveries?: DeliveryRecord[];
  /** v3 스키마 본문 */
  header: { greeting: string };
  conversationOverview: {
    summary: string;
    mainTopics: string[];
    duration: string;
  };
  emotionalStateScore: {
    score: number;          // 0~100
    label: string;
    basis: string;
    note: string;
  };
  impressiveExcerpts: ImpressiveExcerpt[];
  memoryImagePrompt: MemoryImagePrompt | null;
  nextSessionPreview: {
    text: string;
    scheduledDate: string | null;
  };
  closingNote: string;
}

// ─────────────────────────────────────────────
//  헬퍼
// ─────────────────────────────────────────────
export function statusLabel(s: ReportStatus): string {
  return ({ draft: '검토 대기', reviewed: '검토 완료', sent: '발송됨' } as const)[s];
}
export function styleLabel(s: ReportStyle): string {
  return ({
    anime_warm: '따뜻한 일러스트',
    watercolor_warm: '따뜻한 수채화',
    pencil_sketch: '연필 스케치',
    soft_illustration: '부드러운 일러스트',
    oil_painting_warm: '따뜻한 유화',
  } as const)[s];
}

/** "YYYY-MM-DD" 포맷 */
export function dateKo(iso: string): string {
  return iso.slice(0, 10);
}

export function findReportById(_id: string): GuardianReport | undefined {
  return undefined;
}

