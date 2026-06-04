import { createServiceRoleClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Facility } from '@/lib/facilities';

interface DbFacilityRow {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  address: string | null;
  created_at: string;
  members: { count: number }[] | null;
}

export interface FacilitiesFetchResult {
  facilities: Facility[];
  source: 'db' | 'mock';
}

export async function fetchFacilities(): Promise<FacilitiesFetchResult> {
  if (!isSupabaseConfigured()) {
    return { facilities: [], source: 'mock' };
  }
  try {
    // service-role 사용 — 모든 admin이 모든 시설 보는 게 정책이고,
    // 페이지 접근 자체가 admin 레이아웃에서 이미 인증 가드 통과한 상태.
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('facilities')
      .select('id, name, code, phone, manager_name, manager_phone, address, created_at, members(count)')
      .order('created_at', { ascending: true });

    if (error || !data) {
      console.error('[fetchFacilities] supabase error', error);
      return { facilities: [], source: 'mock' };
    }

    const rows = data as unknown as DbFacilityRow[];
    return {
      facilities: rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        phone: r.phone ?? undefined,
        managerName: r.manager_name ?? undefined,
        managerPhone: r.manager_phone ?? undefined,
        address: r.address ?? undefined,
        createdAt: r.created_at,
        memberCount: r.members?.[0]?.count ?? 0,
      })),
      source: 'db',
    };
  } catch (e) {
    console.error('[fetchFacilities] unexpected', e);
    return { facilities: [], source: 'mock' };
  }
}
