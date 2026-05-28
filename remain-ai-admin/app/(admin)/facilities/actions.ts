'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Facility } from '@/lib/facilities';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CreateFacilityResult extends ActionResult {
  facility?: Facility;
}

export interface FacilityInput {
  name: string;
  phone?: string;
  managerName?: string;
  managerPhone?: string;
  address?: string;
}

async function getAuthedClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('로그인이 필요합니다.');
  }
  return supabase;
}

function genCode(): string {
  // FAC- + 영문 대문자/숫자 6자 — DB의 unique 제약을 자연스럽게 만족시키는 짧은 식별자
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return `FAC-${s}`;
}

function normalize(input: FacilityInput) {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    manager_name: input.managerName?.trim() || null,
    manager_phone: input.managerPhone?.trim() || null,
    address: input.address?.trim() || null,
  };
}

function validate(name: string): string | null {
  if (!name) return '시설명을 입력해 주세요.';
  if (name.length > 100) return '시설명은 100자 이내로 입력해 주세요.';
  return null;
}

export async function createFacility(input: FacilityInput): Promise<CreateFacilityResult> {
  const n = normalize(input);
  const err = validate(n.name);
  if (err) return { ok: false, error: err };

  try {
    const supabase = await getAuthedClient();

    // 코드 중복 시 한 번 재시도
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = genCode();
      const { data, error } = await supabase
        .from('facilities')
        .insert({ name: n.name, code, phone: n.phone, manager_name: n.manager_name, manager_phone: n.manager_phone, address: n.address })
        .select('id, name, code, phone, manager_name, manager_phone, address, created_at')
        .single();

      if (!error && data) {
        revalidatePath('/facilities');
        return {
          ok: true,
          facility: {
            id: data.id,
            name: data.name,
            code: data.code,
            phone: data.phone ?? undefined,
            managerName: data.manager_name ?? undefined,
            managerPhone: data.manager_phone ?? undefined,
            address: data.address ?? undefined,
            createdAt: data.created_at,
            memberCount: 0,
          },
        };
      }

      // 코드 중복은 retry, 그 외는 즉시 실패
      if (error?.code !== '23505') {
        return { ok: false, error: error?.message ?? '등록 실패' };
      }
    }
    return { ok: false, error: '코드 생성 충돌 — 다시 시도해 주세요.' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '등록 실패' };
  }
}

export async function updateFacility(input: FacilityInput & { id: string }): Promise<ActionResult> {
  const n = normalize(input);
  const err = validate(n.name);
  if (err) return { ok: false, error: err };

  try {
    const supabase = await getAuthedClient();
    const { error } = await supabase
      .from('facilities')
      .update({
        name: n.name,
        phone: n.phone,
        manager_name: n.manager_name,
        manager_phone: n.manager_phone,
        address: n.address,
      })
      .eq('id', input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/facilities');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '수정 실패' };
  }
}

export async function deleteFacility(id: string): Promise<ActionResult> {
  try {
    const supabase = await getAuthedClient();
    const { error } = await supabase.from('facilities').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') {
        return { ok: false, error: '회원이 등록된 시설은 삭제할 수 없습니다. 회원을 먼저 다른 시설로 옮기거나 삭제하세요.' };
      }
      return { ok: false, error: error.message };
    }
    revalidatePath('/facilities');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '삭제 실패' };
  }
}
