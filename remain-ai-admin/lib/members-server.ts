/**
 * 서버 전용 회원 데이터 fetcher.
 *
 *  - Supabase 환경변수 셋업됨 + 로그인됨 → DB 조회 (RLS 통해 시설 권한 자동)
 *  - 미설정 또는 에러 → 빈 배열
 */

import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Member } from '@/lib/members';
import type { CognitiveLevel } from '@/lib/live-sessions';

interface DbMemberRow {
  id: string;
  name: string;
  age: number;
  cognitive_level: CognitiveLevel;
  facility_id: string;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  kakao_channel_linked: boolean;
  family_status: { father: 'alive'|'deceased'|'unknown'; mother: 'alive'|'deceased'|'unknown'; spouse: 'alive'|'deceased'|'unknown' } | null;
  taboo_topics: string[] | null;
  consent: { L1: boolean; L2: boolean; L3: boolean; L4: boolean; L5: boolean; L6: boolean } | null;
  session_count: number;
  last_session_at: string | null;
  in_active_session: boolean;
  registered_at: string;
  facilities?: { name: string } | null;
}

function rowToMember(row: DbMemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    cognitiveLevel: row.cognitive_level,
    facility: row.facilities?.name ?? row.facility_id,
    sessionCount: row.session_count,
    lastSessionAt: row.last_session_at ?? undefined,
    inActiveSession: row.in_active_session,
    guardianName: row.guardian_name ?? undefined,
    guardianRelation: row.guardian_relation ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    guardianEmail: row.guardian_email ?? undefined,
    kakaoChannelLinked: row.kakao_channel_linked,
    familyStatus: row.family_status ?? undefined,
    tabooTopics: row.taboo_topics ?? undefined,
    consent: row.consent ?? undefined,
    registeredAt: row.registered_at,
  };
}

export interface MembersFetchResult {
  members: Member[];
  source: 'db' | 'unconfigured';
}

export async function fetchMembers(): Promise<MembersFetchResult> {
  if (!isSupabaseConfigured()) {
    return { members: [], source: 'unconfigured' };
  }
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('members')
      .select('*, facilities ( name )')
      .order('last_session_at', { ascending: false, nullsFirst: false });

    if (error || !data) {
      console.error('[fetchMembers] supabase error', error);
      return { members: [], source: 'db' };
    }

    return {
      members: (data as unknown as DbMemberRow[]).map(rowToMember),
      source: 'db',
    };
  } catch (e) {
    console.error('[fetchMembers] unexpected', e);
    return { members: [], source: 'db' };
  }
}

export async function fetchMemberById(id: string): Promise<Member | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('members')
      .select('*, facilities ( name )')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return rowToMember(data as unknown as DbMemberRow);
  } catch (e) {
    console.error('[fetchMemberById]', e);
    return null;
  }
}
