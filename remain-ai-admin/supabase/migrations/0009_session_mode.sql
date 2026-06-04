-- 세션 운영 방식 구분.
--   voice        — 어르신 음성 → Whisper STT → Claude → TTS (현재 기본)
--   stenographer — admin이 어르신 발화를 직접 타이핑 → Claude → TTS

alter table public.sessions
  add column if not exists mode text not null default 'voice'
    check (mode in ('voice', 'stenographer'));
