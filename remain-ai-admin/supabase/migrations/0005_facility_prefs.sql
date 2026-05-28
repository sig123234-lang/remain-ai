-- ─────────────────────────────────────────────
--  facilities 테이블에 기본 동의(L1~L6) + 알림 설정 jsonb 컬럼 추가
--
--  추가 필드:
--    - default_consent     : 신규 회원 등록 시 적용할 기본 동의값
--                            기본값: members.consent 컬럼 기본값과 동일
--                            ({"L1":true,"L2":true,"L3":true,"L4":false,"L5":true,"L6":false})
--    - notification_prefs  : 시설 단위 알림 자동화 설정
--                            { crisisEmail, autoSendReport, weeklyDigest, ruleViolationDigest }
--
--  모두 nullable이 아니며 기본값 보장 — 기존 행도 default 채워서 즉시 사용 가능.
-- ─────────────────────────────────────────────

alter table public.facilities
  add column if not exists default_consent jsonb not null default
    '{"L1":true,"L2":true,"L3":true,"L4":false,"L5":true,"L6":false}'::jsonb,
  add column if not exists notification_prefs jsonb not null default
    '{"crisisEmail":true,"autoSendReport":false,"weeklyDigest":false,"ruleViolationDigest":true}'::jsonb;
