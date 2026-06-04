/**
 * admin 권한·시설 매핑 진단.
 * service-role로 admins + facilities 통째로 조회.
 * 운영용 X, 디버그 전용.
 */

import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // 로그인 세션에서 auth.uid() 가져오기 (RLS가 보는 그 값)
  const userClient = await createServerClient();
  const { data: { user: authUser } } = await userClient.auth.getUser();

  const sb = createServiceRoleClient();

  const [admins, facilities] = await Promise.all([
    sb.from('admins').select('id, email, name, role, facility_id'),
    sb.from('facilities').select('id, name, code'),
  ]);

  if (admins.error) return NextResponse.json({ error: admins.error.message }, { status: 500 });
  if (facilities.error) return NextResponse.json({ error: facilities.error.message }, { status: 500 });

  // auth user vs admins row 매칭 확인
  const authUid = authUser?.id ?? null;
  const authEmail = authUser?.email ?? null;
  const matchingAdmin = authUid ? (admins.data ?? []).find((a) => a.id === authUid) : null;
  const adminByEmail = authEmail ? (admins.data ?? []).find((a) => a.email === authEmail) : null;

  // 매핑 보기 좋게: admin.facility_id를 facility.name으로 치환한 view 같이 첨부
  const facMap = new Map((facilities.data ?? []).map((f) => [f.id, f.name]));
  const adminView = (admins.data ?? []).map((a) => ({
    email: a.email,
    name: a.name,
    role: a.role,
    facility_id: a.facility_id,
    facility_name: a.facility_id ? facMap.get(a.facility_id) ?? '(facility_id가 가리키는 시설이 없음)' : '(없음 — NULL)',
  }));

  // 로그인된 user-client로 facilities·members 조회해서 RLS 동작 확인
  const userFacilities = await userClient.from('facilities').select('id, name').limit(5);
  const userMembers = await userClient.from('members').select('id, name').limit(5);
  const userFacilitiesEmbed = await userClient.from('facilities').select('id, name, members(count)').limit(2);

  return NextResponse.json({
    authUser: {
      uid: authUid,
      email: authEmail,
      isLoggedIn: Boolean(authUser),
    },
    rlsTest: {
      facilities_simple: { ok: !userFacilities.error, count: userFacilities.data?.length ?? 0, error: userFacilities.error?.message ?? null, code: userFacilities.error?.code ?? null },
      members_simple: { ok: !userMembers.error, count: userMembers.data?.length ?? 0, error: userMembers.error?.message ?? null, code: userMembers.error?.code ?? null },
      facilities_with_members_count: { ok: !userFacilitiesEmbed.error, error: userFacilitiesEmbed.error?.message ?? null, code: userFacilitiesEmbed.error?.code ?? null },
    },
    matchCheck: {
      adminRowMatchesAuthUid: Boolean(matchingAdmin),
      adminRowExistsForEmail: Boolean(adminByEmail),
      mismatchDetected: Boolean(adminByEmail && !matchingAdmin),
      mismatchDetail: adminByEmail && !matchingAdmin
        ? `이메일은 admins에 등록돼있는데 (${adminByEmail.id}) auth.uid() (${authUid})와 다름 — 그래서 RLS가 거부`
        : null,
    },
    admins: adminView,
    facilities: facilities.data ?? [],
  });
}
