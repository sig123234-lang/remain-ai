-- ─────────────────────────────────────────────
--  facilities 테이블에 연락처/주소 컬럼 추가
--
--  추가 필드:
--    - phone           : 시설 대표 전화
--    - manager_name    : 시설 관리자 이름
--    - manager_phone   : 시설 관리자 연락처
--    - address         : 시설 주소
--
--  모두 nullable — 기존 행 영향 없음.
-- ─────────────────────────────────────────────

alter table public.facilities
  add column if not exists phone         text,
  add column if not exists manager_name  text,
  add column if not exists manager_phone text,
  add column if not exists address       text;
