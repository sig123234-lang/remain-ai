-- ─────────────────────────────────────────────
--  시설(facilities) CRUD 정책 추가 + 회원 SELECT는 모든 admin이 모든 시설 볼 수 있게 완화
--
--  배경:
--    0002_rls.sql에서 facilities는 SELECT 정책만 있고, current_facility_id() = id
--    로 제한되어 있어서 admin이 본인 시설 1개만 보임. 시설 관리 페이지에서는
--    모든 시설을 보고 등록/삭제할 수 있어야 하므로 정책을 다시 만든다.
-- ─────────────────────────────────────────────

-- 기존 SELECT 정책 제거 후 재설정
drop policy if exists "facilities_select_own" on public.facilities;

-- 로그인된 admin이면 모든 시설 조회 가능 (시설 관리 페이지용)
create policy "facilities_select_any_admin" on public.facilities for select
  using (exists (select 1 from public.admins where id = auth.uid()));

-- 로그인된 admin이면 시설 등록 가능
create policy "facilities_insert_any_admin" on public.facilities for insert
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- 로그인된 admin이면 시설 수정 가능
create policy "facilities_update_any_admin" on public.facilities for update
  using (exists (select 1 from public.admins where id = auth.uid()))
  with check (exists (select 1 from public.admins where id = auth.uid()));

-- 로그인된 admin이면 시설 삭제 가능 (단, 회원이 남아있으면 FK RESTRICT로 막힘)
create policy "facilities_delete_any_admin" on public.facilities for delete
  using (exists (select 1 from public.admins where id = auth.uid()));
