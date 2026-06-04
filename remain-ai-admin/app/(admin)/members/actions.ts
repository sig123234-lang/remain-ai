'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Member, FamilyStatus, ConsentStatus } from '@/lib/members';
import type { CognitiveLevel } from '@/lib/live-sessions';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CreateMemberInput {
  name: string;
  age: number;
  cognitiveLevel: CognitiveLevel;
  facilityId: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone?: string;
  guardianEmail?: string;
  kakaoChannelLinked: boolean;
  familyStatus: FamilyStatus;
  tabooTopics: string[];
  consent: ConsentStatus;
}

export interface CreateMemberResult extends ActionResult {
  member?: Member;
}

export async function createMember(input: CreateMemberInput): Promise<CreateMemberResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  // 기본 검증
  if (!input.name?.trim()) return { ok: false, error: '이름을 입력해 주세요.' };
  if (!input.age || input.age < 20 || input.age > 120) return { ok: false, error: '나이를 20~120 사이로 입력해 주세요.' };
  if (!input.facilityId) return { ok: false, error: '시설을 선택해 주세요.' };
  if (!input.guardianName?.trim()) return { ok: false, error: '보호자 이름을 입력해 주세요.' };
  if (!input.consent.L1 || !input.consent.L2 || !input.consent.L3) {
    return { ok: false, error: '세션 운영을 위해 L1~L3 동의는 필수입니다.' };
  }

  // 인증은 user-client로 확인, 실제 insert는 service-role로 (RLS 우회).
  // 페이지 단계의 admin 레이아웃 가드가 이미 통과한 상태이므로 안전.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const supabase = createServiceRoleClient();
  const payload = {
    facility_id: input.facilityId,
    name: input.name.trim(),
    age: input.age,
    cognitive_level: input.cognitiveLevel,
    guardian_name: input.guardianName.trim(),
    guardian_relation: input.guardianRelation,
    guardian_phone: input.guardianPhone?.trim() || null,
    guardian_email: input.guardianEmail?.trim() || null,
    kakao_channel_linked: input.kakaoChannelLinked,
    family_status: input.familyStatus,
    taboo_topics: input.tabooTopics.length > 0 ? input.tabooTopics : null,
    consent: input.consent,
  };

  const { data, error } = await supabase
    .from('members')
    .insert(payload)
    .select('*, facilities ( name )')
    .single();

  if (error || !data) {
    // 흔한 RLS 메시지를 사람 말로
    const msg = error?.message ?? '등록 실패';
    if (error?.code === '42501' || /row-level security/i.test(msg)) {
      return {
        ok: false,
        error: 'admin 권한 확인이 필요합니다. admins 테이블에 본인 계정 행이 있는지 확인하세요. (마이그레이션 0008 적용 후에도 발생하면 다시 알려 주세요)',
      };
    }
    return { ok: false, error: msg };
  }

  const row = data as {
    id: string; name: string; age: number; cognitive_level: CognitiveLevel; facility_id: string;
    guardian_name: string | null; guardian_relation: string | null; guardian_phone: string | null; guardian_email: string | null;
    kakao_channel_linked: boolean; family_status: FamilyStatus | null; taboo_topics: string[] | null;
    consent: ConsentStatus | null; session_count: number; last_session_at: string | null;
    in_active_session: boolean; registered_at: string; facilities: { name: string } | null;
  };

  const member: Member = {
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

  revalidatePath('/members');
  return { ok: true, member };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/members');
  redirect('/members');
}
