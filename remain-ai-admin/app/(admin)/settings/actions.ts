'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  parseConsent,
  parseNotificationPrefs,
  type ConsentDefaults,
  type NotificationPrefs,
} from '@/lib/facility-settings';

export interface FacilityPrefs {
  facilityId: string | null;
  facilityName: string | null;
  defaultConsent: ConsentDefaults;
  notificationPrefs: NotificationPrefs;
}

export interface SavePrefsInput {
  defaultConsent: ConsentDefaults;
  notificationPrefs: NotificationPrefs;
}

export interface SavePrefsResult {
  ok: boolean;
  error?: string;
}

// 현재 admin의 facility에 묶인 기본값을 로드. facility_id가 없으면 facilityId=null.
export async function loadFacilityPrefs(): Promise<FacilityPrefs> {
  const fallback: FacilityPrefs = {
    facilityId: null,
    facilityName: null,
    defaultConsent: parseConsent(null),
    notificationPrefs: parseNotificationPrefs(null),
  };

  if (!isSupabaseConfigured()) return fallback;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fallback;

  // admin → facility_id
  const { data: admin } = await supabase
    .from('admins')
    .select('facility_id')
    .eq('id', user.id)
    .maybeSingle();

  const facilityId = (admin as { facility_id: string | null } | null)?.facility_id ?? null;
  if (!facilityId) return fallback;

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, name, default_consent, notification_prefs')
    .eq('id', facilityId)
    .maybeSingle();

  if (!facility) return fallback;

  const row = facility as {
    id: string;
    name: string;
    default_consent: unknown;
    notification_prefs: unknown;
  };

  return {
    facilityId: row.id,
    facilityName: row.name,
    defaultConsent: parseConsent(row.default_consent),
    notificationPrefs: parseNotificationPrefs(row.notification_prefs),
  };
}

export async function saveFacilityPrefs(input: SavePrefsInput): Promise<SavePrefsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  // 입력 검증 — 모든 키가 boolean인지 확인 (parseXxx로 정규화)
  const consent = parseConsent(input.defaultConsent);
  const prefs = parseNotificationPrefs(input.notificationPrefs);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const { data: admin } = await supabase
    .from('admins')
    .select('facility_id')
    .eq('id', user.id)
    .maybeSingle();
  const facilityId = (admin as { facility_id: string | null } | null)?.facility_id ?? null;

  if (!facilityId) {
    return { ok: false, error: '프로필에 시설이 연결되어 있지 않습니다. 시설 관리에서 먼저 시설을 만들고 연결해 주세요.' };
  }

  const { error } = await supabase
    .from('facilities')
    .update({
      default_consent: consent,
      notification_prefs: prefs,
    })
    .eq('id', facilityId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
