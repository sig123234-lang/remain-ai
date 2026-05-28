-- ─────────────────────────────────────────────
--  시드 데이터 — 시설 3곳 + 회원 mock 16명
--
--  실행: Supabase SQL Editor에 그대로 붙여넣기 (service_role로 실행되므로 RLS 우회)
--  실행 전: 0001_initial.sql + 0002_rls.sql 적용 완료 상태여야 함.
--
--  ※ 어드민 계정은 별도 — Supabase Authentication 페이지에서 사용자 생성 후
--    아래 admins INSERT를 수동으로 실행 (이메일·UUID 사용자에 맞게 수정).
-- ─────────────────────────────────────────────

-- 시설
insert into public.facilities (id, name, code) values
  ('00000000-0000-0000-0000-000000000001', '한울요양원 A동',     'HAA'),
  ('00000000-0000-0000-0000-000000000002', '한울요양원 B동',     'HAB'),
  ('00000000-0000-0000-0000-000000000003', '한빛노인복지센터',   'HBC')
on conflict (id) do nothing;

-- 회원 (16명)
insert into public.members (
  id, facility_id, name, age, cognitive_level,
  guardian_name, guardian_relation, guardian_phone, guardian_email, kakao_channel_linked,
  family_status, session_count, last_session_at, in_active_session
) values
  ('00000000-0001-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '이화상', 82, 'normal',
   '민수', '아들', '010-2345-6789', 'minsoo@example.com', true,
   '{"father":"deceased","mother":"unknown","spouse":"unknown"}'::jsonb,
   3, now() - interval '2 days', true),
  ('00000000-0001-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '박순자', 78, 'MCI',
   '지영', '딸', '010-3456-7890', null, false,
   null, 1, now() - interval '5 days', true),
  ('00000000-0001-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '김영자', 89, 'normal',
   '윤재', '아들', '010-4567-8901', 'yj@example.com', true,
   null, 7, now() - interval '1 day', true),
  ('00000000-0001-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '최정훈', 73, 'normal',
   '예린', '딸', '010-5678-9012', null, false, null, 2, now() - interval '4 days', true),
  ('00000000-0001-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '정명숙', 85, 'normal',
   '도현', '아들', '010-6789-0123', null, true, null, 5, now() - interval '3 days', true),
  ('00000000-0001-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', '김태수', 80, 'MCI',
   '서영', '며느리', null, null, false, null, 4, now() - interval '2 days', true),
  ('00000000-0001-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '윤옥분', 77, 'normal',
   '민지', '손녀', null, null, false, null, 6, now() - interval '1 day', true),
  ('00000000-0001-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', '강신애', 84, 'normal',
   '준호', '아들', null, null, false, null, 1, now() - interval '7 days', true),
  ('00000000-0001-0000-0000-000000000009', '00000000-0000-0000-0000-000000000003', '송미옥', 76, 'normal',
   '하늘', '딸', null, null, false, null, 8, now(), true),
  ('00000000-0001-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '한경수', 81, 'normal',
   '재민', '아들', null, null, false, null, 2, now(), true),
  -- 진행 중 아닌 회원들
  ('00000000-0001-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '오순임', 79, 'normal',
   null, null, null, null, false, null, 4, now() - interval '2 days', false),
  ('00000000-0001-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', '권만식', 83, 'MCI',
   null, null, null, null, false, null, 2, now() - interval '6 days', false),
  ('00000000-0001-0000-0000-000000000013', '00000000-0000-0000-0000-000000000003', '백명자', 87, 'normal',
   null, null, null, null, false, null, 9, now() - interval '1 day', false),
  ('00000000-0001-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '서태준', 75, 'normal',
   null, null, null, null, false, null, 0, null, false),
  ('00000000-0001-0000-0000-000000000015', '00000000-0000-0000-0000-000000000003', '문정애', 81, 'moderate',
   null, null, null, null, false, null, 3, now() - interval '4 days', false),
  ('00000000-0001-0000-0000-000000000016', '00000000-0000-0000-0000-000000000002', '조영식', 86, 'normal',
   null, null, null, null, false, null, 5, now() - interval '3 days', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
--  어드민 사용자 연결 (수동 — Auth에서 만든 후 실행)
-- ─────────────────────────────────────────────
-- 1) Supabase Dashboard → Authentication → Users → "Add user" → 이메일/비밀번호로 생성
-- 2) 생성된 사용자 UUID 복사
-- 3) 아래 쿼리 실행 (UUID + email 본인 값으로 교체):
--
-- insert into public.admins (id, email, name, role, facility_id) values
--   ('PASTE-USER-UUID-HERE', 'admin@example.com', '관리자', 'admin',
--    '00000000-0000-0000-0000-000000000001');  -- 한울요양원 A동 소속
--
-- 이 admin으로 로그인하면 한울요양원 A동의 회원 7명(M-1,4,7,10,11,14)만 보임 (RLS).
-- 다른 시설 어드민을 만들려면 facility_id를 바꿔서 추가 admins insert.
