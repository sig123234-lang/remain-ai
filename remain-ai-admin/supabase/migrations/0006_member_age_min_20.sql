-- ─────────────────────────────────────────────
--  members.age 하한을 50 → 20으로 완화
--
--  배경: PoC/테스트·시범 운영 단계에서 어르신 외에도 다양한 연령대로
--  세션을 돌려볼 수 있도록 폭을 넓힘. 상한 120은 유지.
-- ─────────────────────────────────────────────

alter table public.members
  drop constraint if exists members_age_check;

alter table public.members
  add constraint members_age_check check (age >= 20 and age <= 120);
