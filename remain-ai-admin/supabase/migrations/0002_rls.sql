-- ─────────────────────────────────────────────
--  Row Level Security — 시설 단위 권한
--
--  정책: 로그인된 admin은 자기가 속한 facility_id의 데이터만 읽기/쓰기.
--  service_role 키는 모든 정책 우회 — 시드/관리 작업 전용.
-- ─────────────────────────────────────────────

-- RLS 활성화
alter table public.facilities          enable row level security;
alter table public.admins              enable row level security;
alter table public.members             enable row level security;
alter table public.sessions            enable row level security;
alter table public.conversation_turns  enable row level security;
alter table public.audio_files         enable row level security;

-- ─────────────────────────────────────────────
--  헬퍼: 현재 로그인된 admin의 facility_id
-- ─────────────────────────────────────────────
create or replace function public.current_facility_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select facility_id from public.admins where id = auth.uid();
$$;

-- ─────────────────────────────────────────────
--  facilities — 본인이 속한 시설만 조회
-- ─────────────────────────────────────────────
create policy "facilities_select_own" on public.facilities for select
  using (id = public.current_facility_id());

-- ─────────────────────────────────────────────
--  admins — 본인 + 같은 시설 동료만 조회
-- ─────────────────────────────────────────────
create policy "admins_select_self_or_same_facility" on public.admins for select
  using (
    id = auth.uid()
    or facility_id = public.current_facility_id()
  );

-- 본인 정보만 수정
create policy "admins_update_self" on public.admins for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─────────────────────────────────────────────
--  members — 본인 시설 회원만 CRUD
-- ─────────────────────────────────────────────
create policy "members_select_same_facility" on public.members for select
  using (facility_id = public.current_facility_id());

create policy "members_insert_same_facility" on public.members for insert
  with check (facility_id = public.current_facility_id());

create policy "members_update_same_facility" on public.members for update
  using (facility_id = public.current_facility_id())
  with check (facility_id = public.current_facility_id());

create policy "members_delete_same_facility" on public.members for delete
  using (facility_id = public.current_facility_id());

-- ─────────────────────────────────────────────
--  sessions / turns / audio — member의 facility로 cascade
-- ─────────────────────────────────────────────
create policy "sessions_same_facility" on public.sessions for all
  using (
    exists (
      select 1 from public.members m
      where m.id = sessions.member_id
        and m.facility_id = public.current_facility_id()
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = sessions.member_id
        and m.facility_id = public.current_facility_id()
    )
  );

create policy "turns_same_facility" on public.conversation_turns for all
  using (
    exists (
      select 1 from public.sessions s
      join public.members m on m.id = s.member_id
      where s.id = conversation_turns.session_id
        and m.facility_id = public.current_facility_id()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      join public.members m on m.id = s.member_id
      where s.id = conversation_turns.session_id
        and m.facility_id = public.current_facility_id()
    )
  );

create policy "audio_same_facility" on public.audio_files for all
  using (
    exists (
      select 1 from public.sessions s
      join public.members m on m.id = s.member_id
      where s.id = audio_files.session_id
        and m.facility_id = public.current_facility_id()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      join public.members m on m.id = s.member_id
      where s.id = audio_files.session_id
        and m.facility_id = public.current_facility_id()
    )
  );
