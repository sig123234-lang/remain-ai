-- ─────────────────────────────────────────────
--  모든 admin이 모든 시설의 데이터를 관리할 수 있도록 RLS 완화
--
--  배경:
--    0002의 "본인 시설만" 정책은 admin 한 명 = 시설 한 곳 모델 가정.
--    실 운영에서는 본사·관리자 한 명이 여러 시설을 함께 관리해야 함.
--    facilities 테이블은 이미 0003에서 "any_admin"으로 완화됨.
--    이번 0008로 members / sessions / conversation_turns / audio_files / admins
--    까지 동일 패턴으로 통일.
--
--  결과:
--    인증된 admin row가 존재하면 어떤 시설의 데이터든 CRUD 가능.
--    어르신 세션 페이지(/session/*) 등 service-role 경로는 영향 없음.
-- ─────────────────────────────────────────────

-- members
drop policy if exists "members_select_same_facility" on public.members;
drop policy if exists "members_insert_same_facility" on public.members;
drop policy if exists "members_update_same_facility" on public.members;
drop policy if exists "members_delete_same_facility" on public.members;

create policy "members_select_any_admin" on public.members for select
  using (exists (select 1 from public.admins where id = auth.uid()));
create policy "members_insert_any_admin" on public.members for insert
  with check (exists (select 1 from public.admins where id = auth.uid()));
create policy "members_update_any_admin" on public.members for update
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));
create policy "members_delete_any_admin" on public.members for delete
  using (exists (select 1 from public.admins where id = auth.uid()));

-- sessions
drop policy if exists "sessions_same_facility" on public.sessions;
create policy "sessions_any_admin" on public.sessions for all
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- conversation_turns
drop policy if exists "turns_same_facility" on public.conversation_turns;
create policy "turns_any_admin" on public.conversation_turns for all
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- audio_files
drop policy if exists "audio_same_facility" on public.audio_files;
create policy "audio_any_admin" on public.audio_files for all
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- admins — 모든 admin row를 다른 admin이 볼 수 있게 (협업자 목록)
drop policy if exists "admins_select_self_or_same_facility" on public.admins;
create policy "admins_select_any_admin" on public.admins for select
  using (exists (select 1 from public.admins where id = auth.uid()));

-- current_facility_id() 헬퍼는 RLS에선 더 이상 안 쓰지만,
-- admins.facility_id는 여전히 "이 admin이 주로 일하는 시설" 힌트로 사용 가능.
-- 함수는 그대로 두고 누가 참조하든 동작은 유지.
