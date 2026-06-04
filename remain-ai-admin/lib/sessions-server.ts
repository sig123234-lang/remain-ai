/**
 * 서버 전용 세션 데이터 액세스.
 *
 *  - createSession: admin이 새 대화 세션 생성 (로그인 필요)
 *  - fetchSessionContext: /session/[id] 페이지에서 세션+회원 조회 (로그인 불필요 — service-role)
 *  - fetchTurns: 대화 히스토리 조회
 *  - appendTurn: 대화 턴 저장
 */

import 'server-only';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { ConversationMemberContext } from '@/lib/conversation/system-prompt';
import type { FamilyStatus } from '@/lib/members';
import {
  appendCachedTurn,
  getCachedContext,
  getCachedTurns,
  invalidateContext,
  setCachedContext,
  setCachedTurns,
} from '@/lib/conversation/cache';

export type SessionMode = 'voice' | 'stenographer' | 'realtime';

export interface SessionContext {
  sessionId: string;
  status: string;
  sessionNumber: number;
  mode: SessionMode;
  member: ConversationMemberContext;
}

interface DbMemberRow {
  id: string;
  name: string;
  age: number;
  cognitive_level: 'normal' | 'MCI' | 'moderate';
  facility_id: string;
  guardian_name: string | null;
  guardian_relation: string | null;
  family_status: FamilyStatus | null;
  taboo_topics: string[] | null;
  facilities?: { name: string } | null;
}

type CreateSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string };

// 진행 중으로 간주하는 status들 — completed만 종료된 것으로 본다.
type DbActiveStatus = 'active' | 'wrapup' | 'force_end' | 'post_processing';
const ACTIVE_STATUSES: DbActiveStatus[] = ['active', 'wrapup', 'force_end', 'post_processing'];

/**
 * Admin이 새 세션을 시작할 때 호출 — 로그인 필수.
 * 같은 회원의 기존 active 세션이 있으면 자동 종료(completed)하고 새로 만든다.
 * member_id 기준 유일성 보장. 동명이인은 member_id가 다르므로 영향 없음.
 */
export async function createSession(memberId: string, mode: SessionMode = 'voice'): Promise<CreateSessionResult> {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return { ok: false, error: '로그인이 필요합니다.' };

    // 인증 통과 후 실제 작업은 service-role로 (RLS 우회).
    const supabase = createServiceRoleClient();
    // 1. 이 회원의 기존 active 세션 자동 종료
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('member_id', memberId)
      .in('status', ACTIVE_STATUSES);

    // 2. 회원의 전체 세션 카운트로 session_number 결정
    const { count, error: countErr } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId);
    if (countErr) return { ok: false, error: countErr.message };

    const sessionNumber = (count ?? 0) + 1;

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        member_id: memberId,
        session_number: sessionNumber,
        status: 'active',
        mode,
      })
      .select('id')
      .single();

    if (error || !data) return { ok: false, error: error?.message ?? '세션 생성 실패' };
    return { ok: true, sessionId: data.id as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 세션 종료 — status='completed', ended_at=now.
 * 어르신/관리자 양쪽에서 호출 (sessionId만 알면 종료 가능).
 */
export async function endSession(sessionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const sb = createServiceRoleClient();
    const startedAtRes = await sb
      .from('sessions')
      .select('started_at')
      .eq('id', sessionId)
      .maybeSingle();
    const startedAt = (startedAtRes.data as { started_at: string } | null)?.started_at;
    const durationMinutes = startedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60_000))
      : 0;

    const { error } = await sb
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', sessionId);
    if (error) return { ok: false, error: error.message };
    // 캐시의 status가 'active'로 박혀 있을 수 있어 무효화
    await invalidateContext(sessionId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * /session/[id] 페이지 + 음성 API에서 사용. 로그인 없이 RLS 우회로 조회.
 * sessionId UUID 자체가 진입 credential.
 */
export async function fetchSessionContext(sessionId: string): Promise<SessionContext | null> {
  // 1. Redis 캐시 우선 — 매 턴 Supabase 왕복 회피.
  const cached = await getCachedContext(sessionId);
  if (cached) return cached;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id, status, session_number, mode,
        members ( id, name, age, cognitive_level, facility_id, guardian_name, guardian_relation, family_status, taboo_topics, facilities ( name ) )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as unknown as {
      id: string;
      status: string;
      session_number: number;
      mode: SessionMode | null;
      members: DbMemberRow | null;
    };
    const member = row.members;
    if (!member) return null;

    const ctx: SessionContext = {
      sessionId: row.id,
      status: row.status,
      sessionNumber: row.session_number,
      mode: row.mode ?? 'voice',
      member: {
        name: member.name,
        age: member.age,
        cognitiveLevel: member.cognitive_level,
        facility: member.facilities?.name,
        guardianName: member.guardian_name ?? undefined,
        guardianRelation: member.guardian_relation ?? undefined,
        familyStatus: member.family_status ?? undefined,
        tabooTopics: member.taboo_topics ?? undefined,
        sessionNumber: row.session_number,
      },
    };
    // 종료된 세션은 캐시 안 함 (불필요)
    if (ctx.status !== 'completed') await setCachedContext(sessionId, ctx);
    return ctx;
  } catch {
    return null;
  }
}

export interface TurnRow {
  role: 'ai' | 'elderly';
  text: string;
  turnIndex: number;
}

export async function fetchTurns(sessionId: string): Promise<TurnRow[]> {
  // Redis 캐시 우선
  const cached = await getCachedTurns(sessionId);
  if (cached) return cached;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('conversation_turns')
      .select('role, text, turn_index')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: true });
    if (error || !data) return [];
    const turns = (data as { role: 'ai' | 'elderly'; text: string; turn_index: number }[]).map((t) => ({
      role: t.role,
      text: t.text,
      turnIndex: t.turn_index,
    }));
    await setCachedTurns(sessionId, turns);
    return turns;
  } catch {
    return [];
  }
}

/**
 * 실시간 세션 보드용 — 진행 중인 세션 목록.
 * sessions 테이블 + 마지막 턴 + 회원 정보 조인. service-role 사용.
 */
import type { LiveSession, SessionPhase } from '@/lib/live-sessions';

interface LiveSessionRow {
  id: string;
  session_number: number;
  started_at: string;
  status: string;
  turn_count: number;
  depth_level: number;
  risk_level: 'low' | 'medium' | 'high';
  treasure_detected: boolean;
  main_topic: string | null;
  members: {
    name: string;
    age: number;
    cognitive_level: 'normal' | 'MCI' | 'moderate';
    facilities: { name: string } | null;
  } | null;
}

/**
 * 청취 페이지용 — 단일 세션 + 최근 N턴 + 운영 모드.
 * status가 완료된 세션도 반환 (관리자가 진행 후에도 들춰볼 수 있게).
 */
export async function fetchLiveSessionById(sessionId: string, recentTurnLimit = 10): Promise<{ session: LiveSession; mode: SessionMode } | null> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select(`
        id, session_number, started_at, status, turn_count,
        depth_level, risk_level, treasure_detected, main_topic, mode,
        members ( name, age, cognitive_level, facilities ( name ) )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return null;
    const r = data as unknown as LiveSessionRow & { mode: SessionMode | null };
    if (!r.members) return null;

    const { data: turns } = await sb
      .from('conversation_turns')
      .select('role, text, created_at')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: false })
      .limit(recentTurnLimit);

    const recentTurns = ((turns ?? []) as { role: 'ai' | 'elderly'; text: string; created_at: string }[])
      .map((t) => ({ role: t.role, text: t.text, at: t.created_at }))
      .reverse();

    const elapsedMs = Date.now() - new Date(r.started_at).getTime();
    const phase: SessionPhase =
      r.status === 'wrapup' ? 'wrapup'
      : r.status === 'force_end' ? 'force_end'
      : r.status === 'post_processing' ? 'post_processing'
      : 'main';
    const depth = (Math.max(1, Math.min(4, r.depth_level)) as 1 | 2 | 3 | 4);

    const session: LiveSession = {
      id: r.id,
      elderly: {
        name: r.members.name,
        age: r.members.age,
        cognitiveLevel: r.members.cognitive_level,
        sessionNumber: r.session_number,
      },
      facility: r.members.facilities?.name ?? '',
      startedAt: r.started_at,
      elapsedMinutes: Math.max(0, Math.floor(elapsedMs / 60_000)),
      turnCount: r.turn_count,
      hardCapTurns: 30,
      hardCapMinutes: 30,
      sessionPhase: phase,
      depthLevel: depth,
      riskLevel: r.risk_level,
      consecutiveRefusals: 0,
      treasureDetected: r.treasure_detected,
      currentTopic: r.main_topic,
      currentScene: null,
      alerts: [],
      ruleViolationsActive: 0,
      recent: recentTurns[recentTurns.length - 1],
      recentTurns,
    };
    return { session, mode: r.mode ?? 'voice' };
  } catch (e) {
    console.error('[fetchLiveSessionById]', e);
    return null;
  }
}

export interface ExtractedSessionRow {
  sessionId: string;
  memberId: string;
  memberName: string;
  sessionNumber: number;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  turnCount: number;
  extraction: import('@/lib/conversation/extractor').SessionExtraction;
}

/** 회원별 — 추출 완료된 종료 세션 (최신순) */
export async function fetchMemberExtractedSessions(memberId: string): Promise<ExtractedSessionRow[]> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select('id, session_number, started_at, ended_at, duration_minutes, turn_count, extraction, members ( id, name )')
      .eq('member_id', memberId)
      .not('extraction', 'is', null)
      .order('started_at', { ascending: false });
    if (error || !data) return [];
    return (data as unknown as Array<{
      id: string; session_number: number; started_at: string; ended_at: string | null;
      duration_minutes: number; turn_count: number; extraction: unknown;
      members: { id: string; name: string } | null;
    }>).filter((r) => r.extraction && r.members).map((r) => ({
      sessionId: r.id,
      memberId: r.members!.id,
      memberName: r.members!.name,
      sessionNumber: r.session_number,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      durationMinutes: r.duration_minutes,
      turnCount: r.turn_count,
      extraction: r.extraction as import('@/lib/conversation/extractor').SessionExtraction,
    }));
  } catch (e) {
    console.error('[fetchMemberExtractedSessions]', e);
    return [];
  }
}

/**
 * 단일 세션의 추출을 GuardianReport 형태로 빌드. 리포트 상세 페이지용.
 * 추출 안 됐거나 세션 없으면 null.
 */
export async function fetchGuardianReportBySessionId(sessionId: string): Promise<import('@/lib/guardian-reports').GuardianReport | null> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select(`
        id, session_number, started_at, ended_at, duration_minutes, extraction,
        members (
          id, name, age,
          guardian_name, guardian_relation, guardian_phone, guardian_email, kakao_channel_linked,
          facilities ( name )
        )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as unknown as {
      id: string;
      session_number: number;
      started_at: string;
      ended_at: string | null;
      duration_minutes: number;
      extraction: import('@/lib/conversation/extractor').SessionExtraction | null;
      members: {
        id: string;
        name: string;
        age: number;
        guardian_name: string | null;
        guardian_relation: string | null;
        guardian_phone: string | null;
        guardian_email: string | null;
        kakao_channel_linked: boolean;
        facilities: { name: string } | null;
      } | null;
    };
    if (!row.members || !row.extraction) return null;

    const m = row.members;
    const ex = row.extraction;
    const gr = ex.guardianReport;

    const phaseFor = (idx: number, total: number): 'early' | 'mid' | 'late' => {
      if (total <= 1) return 'mid';
      const r = idx / (total - 1);
      if (r < 0.34) return 'early';
      if (r < 0.67) return 'mid';
      return 'late';
    };

    const toneToScore = (tone: string): { score: number; label: string } => {
      // 추출된 감정 톤 텍스트 → 점수 휴리스틱
      const t = tone.toLowerCase();
      if (/(따뜻|편안|기쁨|행복|희망)/.test(tone)) return { score: 78, label: '안정' };
      if (/(그리움|회상|향수)/.test(tone)) return { score: 65, label: '잔잔함' };
      if (/(슬픔|우울|외로움)/.test(tone)) return { score: 42, label: '가라앉음' };
      if (/(불안|두려|화)/.test(tone)) return { score: 35, label: '동요' };
      if (t) return { score: 60, label: tone.split(',')[0].trim() || '차분함' };
      return { score: 60, label: '차분함' };
    };
    const emo = toneToScore(gr.emotionalTone ?? '');

    const greetingName = m.guardian_name ?? `${m.name}님 보호자`;
    const status: import('@/lib/guardian-reports').ReportStatus =
      ex.reportStatus === 'sent' ? 'sent'
      : ex.reportStatus === 'reviewed' ? 'reviewed'
      : 'draft';

    return {
      id: row.id,
      elderlyId: m.id,
      elderlyName: m.name,
      age: m.age,
      facility: m.facilities?.name ?? '',
      sessionNumber: row.session_number,
      sessionDate: row.started_at,
      durationMinutes: row.duration_minutes,
      guardianName: m.guardian_name ?? '',
      guardianRelation: m.guardian_relation ?? '',
      guardianPhone: m.guardian_phone ?? undefined,
      guardianEmail: m.guardian_email ?? undefined,
      kakaoChannelLinked: m.kakao_channel_linked,
      generatedAt: ex.extractedAt,
      status,
      header: { greeting: `${greetingName}, 안녕하세요.` },
      conversationOverview: {
        summary: gr.summary,
        mainTopics: [gr.mainTopic, ...(ex.entities.timeperiods ?? [])].filter(Boolean).slice(0, 6),
        duration: `${row.duration_minutes}분 대화`,
      },
      emotionalStateScore: {
        score: emo.score,
        label: emo.label,
        basis: gr.emotionalTone || '대화 전반의 정서 톤 종합',
        note: '자동 추출된 휴리스틱 점수입니다. 절대값보다는 추세를 보세요.',
      },
      impressiveExcerpts: gr.impressiveExcerpts.map((e, i) => ({
        context: e.context,
        elderlyQuote: e.elderlyQuote,
        significance: e.significance,
        sessionPhase: phaseFor(i, gr.impressiveExcerpts.length),
      })),
      memoryImagePrompt: null,
      nextSessionPreview: {
        text: '다음 세션에서 오늘 이야기를 이어 더 깊은 회상으로 안내해 보겠습니다.',
        scheduledDate: null,
      },
      closingNote: '오늘 회원님이 자신의 이야기를 들려주신 시간을 보호자님과 함께 나눕니다.',
    };
  } catch (e) {
    console.error('[fetchGuardianReportBySessionId]', e);
    return null;
  }
}

/**
 * 회원별 — 종료된 세션(아카이브) 목록. ArchivedSession 형태로 반환.
 * 회원 상세 페이지에서 사용.
 */
export async function fetchMemberArchivedSessions(memberId: string): Promise<import('@/lib/sessions-archive').ArchivedSession[]> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select('id, member_id, session_number, started_at, ended_at, duration_minutes, turn_count, main_topic, topics, emotional_score, treasure_detected, risk_flagged, extraction')
      .eq('member_id', memberId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false });
    if (error || !data) return [];

    // Turn 정보는 헤더만 필요한 페이지엔 무거우니 빈 배열로. 상세 진입 시 fetchArchivedSessionById로 본문 조회.
    return (data as unknown as Array<{
      id: string; member_id: string; session_number: number;
      started_at: string; ended_at: string | null;
      duration_minutes: number; turn_count: number;
      main_topic: string | null; topics: string[] | null; emotional_score: number | null;
      treasure_detected: boolean; risk_flagged: boolean;
      extraction: unknown;
    }>).map((r) => ({
      id: r.id,
      memberId: r.member_id,
      sessionNumber: r.session_number,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? r.started_at,
      durationMinutes: r.duration_minutes,
      turnCount: r.turn_count,
      mainTopic: r.main_topic ?? (r.extraction as { guardianReport?: { mainTopic?: string } } | null)?.guardianReport?.mainTopic ?? '주제 미정',
      topics: r.topics ?? [],
      emotionalScore: r.emotional_score ?? 0,
      treasureDetected: r.treasure_detected,
      riskFlagged: r.risk_flagged,
      turns: [],
      audio: { stored: false, format: 'webm' as const, durationSec: r.duration_minutes * 60, sizeBytes: 0, channels: 1 as const, sampleRateHz: 16000 },
      reportId: r.extraction ? r.id : undefined,
    }));
  } catch (e) {
    console.error('[fetchMemberArchivedSessions]', e);
    return [];
  }
}

/**
 * 단일 보관된 세션 상세 — 모든 턴 본문 포함.
 */
export async function fetchArchivedSessionById(sessionId: string): Promise<import('@/lib/sessions-archive').ArchivedSession | null> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select('id, member_id, session_number, started_at, ended_at, duration_minutes, turn_count, main_topic, topics, emotional_score, treasure_detected, risk_flagged, extraction, status')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as unknown as {
      id: string; member_id: string; session_number: number;
      started_at: string; ended_at: string | null;
      duration_minutes: number; turn_count: number;
      main_topic: string | null; topics: string[] | null; emotional_score: number | null;
      treasure_detected: boolean; risk_flagged: boolean;
      extraction: unknown; status: string;
    };
    if (r.status !== 'completed') return null;

    const { data: turnRows } = await sb
      .from('conversation_turns')
      .select('turn_index, role, text, timestamp_sec, duration_sec, stt_confidence')
      .eq('session_id', sessionId)
      .order('turn_index', { ascending: true });

    const turns = ((turnRows ?? []) as Array<{
      turn_index: number; role: 'ai' | 'elderly'; text: string;
      timestamp_sec: number; duration_sec: number | null; stt_confidence: number | null;
    }>).map((t) => ({
      index: t.turn_index,
      role: t.role,
      text: t.text,
      timestampSec: Number(t.timestamp_sec ?? 0),
      durationSec: t.duration_sec ?? undefined,
      sttConfidence: t.stt_confidence ?? undefined,
    }));

    return {
      id: r.id,
      memberId: r.member_id,
      sessionNumber: r.session_number,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? r.started_at,
      durationMinutes: r.duration_minutes,
      turnCount: r.turn_count,
      mainTopic: r.main_topic ?? (r.extraction as { guardianReport?: { mainTopic?: string } } | null)?.guardianReport?.mainTopic ?? '주제 미정',
      topics: r.topics ?? [],
      emotionalScore: r.emotional_score ?? 0,
      treasureDetected: r.treasure_detected,
      riskFlagged: r.risk_flagged,
      turns,
      audio: { stored: false, format: 'webm', durationSec: r.duration_minutes * 60, sizeBytes: 0, channels: 1, sampleRateHz: 16000 },
      reportId: r.extraction ? r.id : undefined,
    };
  } catch (e) {
    console.error('[fetchArchivedSessionById]', e);
    return null;
  }
}

/** 전체 — 추출 완료된 세션. 리포트 페이지용. */
export async function fetchAllExtractedSessions(): Promise<ExtractedSessionRow[]> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select('id, session_number, started_at, ended_at, duration_minutes, turn_count, extraction, members ( id, name )')
      .not('extraction', 'is', null)
      .order('started_at', { ascending: false });
    if (error || !data) return [];
    return (data as unknown as Array<{
      id: string; session_number: number; started_at: string; ended_at: string | null;
      duration_minutes: number; turn_count: number; extraction: unknown;
      members: { id: string; name: string } | null;
    }>).filter((r) => r.extraction && r.members).map((r) => ({
      sessionId: r.id,
      memberId: r.members!.id,
      memberName: r.members!.name,
      sessionNumber: r.session_number,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      durationMinutes: r.duration_minutes,
      turnCount: r.turn_count,
      extraction: r.extraction as import('@/lib/conversation/extractor').SessionExtraction,
    }));
  } catch (e) {
    console.error('[fetchAllExtractedSessions]', e);
    return [];
  }
}

export async function fetchActiveLiveSessions(): Promise<LiveSession[]> {
  try {
    const sb = createServiceRoleClient();
    const { data, error } = await sb
      .from('sessions')
      .select(`
        id, session_number, started_at, status, turn_count,
        depth_level, risk_level, treasure_detected, main_topic,
        members ( name, age, cognitive_level, facilities ( name ) )
      `)
      .in('status', ACTIVE_STATUSES)
      .order('started_at', { ascending: false });

    if (error || !data) return [];
    const rows = data as unknown as LiveSessionRow[];

    // 각 세션의 마지막 턴
    const ids = rows.map((r) => r.id);
    const { data: lastTurns } = ids.length === 0 ? { data: [] } : await sb
      .from('conversation_turns')
      .select('session_id, role, text, created_at')
      .in('session_id', ids)
      .order('created_at', { ascending: false });

    const lastBySession = new Map<string, { role: 'ai' | 'elderly'; text: string; at: string }>();
    for (const t of (lastTurns ?? []) as { session_id: string; role: 'ai' | 'elderly'; text: string; created_at: string }[]) {
      if (!lastBySession.has(t.session_id)) {
        lastBySession.set(t.session_id, { role: t.role, text: t.text, at: t.created_at });
      }
    }

    const now = Date.now();
    return rows.filter((r) => r.members).map((r) => {
      const elapsedMs = now - new Date(r.started_at).getTime();
      const phase: SessionPhase =
        r.status === 'wrapup' ? 'wrapup'
        : r.status === 'force_end' ? 'force_end'
        : r.status === 'post_processing' ? 'post_processing'
        : 'main';
      const depth = (Math.max(1, Math.min(4, r.depth_level)) as 1 | 2 | 3 | 4);

      return {
        id: r.id,
        elderly: {
          name: r.members!.name,
          age: r.members!.age,
          cognitiveLevel: r.members!.cognitive_level,
          sessionNumber: r.session_number,
        },
        facility: r.members!.facilities?.name ?? '',
        startedAt: r.started_at,
        elapsedMinutes: Math.max(0, Math.floor(elapsedMs / 60_000)),
        turnCount: r.turn_count,
        hardCapTurns: 30,
        hardCapMinutes: 30,
        sessionPhase: phase,
        depthLevel: depth,
        riskLevel: r.risk_level,
        consecutiveRefusals: 0,
        treasureDetected: r.treasure_detected,
        currentTopic: r.main_topic,
        currentScene: null,
        alerts: [],
        ruleViolationsActive: 0,
        recent: lastBySession.get(r.id),
      } satisfies LiveSession;
    });
  } catch (e) {
    console.error('[fetchActiveLiveSessions]', e);
    return [];
  }
}

export async function saveExtraction(sessionId: string, extraction: unknown): Promise<{ ok: boolean; error?: string }> {
  const sb = createServiceRoleClient();
  const { error } = await sb
    .from('sessions')
    .update({ extraction: extraction as never })
    .eq('id', sessionId);
  if (error) {
    console.error('[saveExtraction] 실패', { sessionId, error: error.message });
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * 세션 종료 + 자동 추출 (API endpoint, admin 액션 양쪽에서 공유).
 * 추출 실패해도 종료 자체는 성공으로 처리.
 */
export async function finalizeSession(sessionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { extractSession } = await import('@/lib/conversation/extractor');
  const ctx = await fetchSessionContext(sessionId);
  if (!ctx) return { ok: false, error: '세션을 찾을 수 없습니다.' };

  if (ctx.status !== 'completed') {
    const result = await endSession(sessionId);
    if (!result.ok) return result;
  }

  // 추출 — 이미 있으면 스킵
  try {
    const sb = createServiceRoleClient();
    const { data } = await sb
      .from('sessions')
      .select('extraction')
      .eq('id', sessionId)
      .maybeSingle();
    const alreadyExtracted = Boolean((data as { extraction: unknown } | null)?.extraction);
    if (!alreadyExtracted) {
      const turns = await fetchTurns(sessionId);
      if (turns.length > 0) {
        const extraction = await extractSession(ctx.member, turns);
        if (extraction) await saveExtraction(sessionId, extraction);
      }
    }
  } catch (e) {
    console.error('[finalizeSession] extraction 실패 (세션은 종료됨)', e);
  }

  return { ok: true };
}

export async function appendTurn(
  sessionId: string,
  role: 'ai' | 'elderly',
  text: string,
  /** 호출자가 인덱스를 이미 알면 전달 — count 쿼리 1회 왕복 절약 (대화 지연 단축). */
  knownTurnIndex?: number,
): Promise<void> {
  const supabase = createServiceRoleClient();
  // 다음 turn_index 계산 — 인덱스를 모르면 count 조회
  let turnIndex = knownTurnIndex;
  if (turnIndex === undefined) {
    const { count } = await supabase
      .from('conversation_turns')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    turnIndex = count ?? 0;
  }

  await supabase.from('conversation_turns').insert({
    session_id: sessionId,
    turn_index: turnIndex,
    role,
    text,
  });

  await supabase
    .from('sessions')
    .update({ turn_count: turnIndex + 1 })
    .eq('id', sessionId);

  // 캐시 동기화 — 다음 턴의 fetchTurns가 Supabase 안 거치게.
  await appendCachedTurn(sessionId, { role, text, turnIndex });
}
