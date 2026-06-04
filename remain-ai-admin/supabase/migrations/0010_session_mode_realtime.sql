-- realtime 모드 추가 — OpenAI gpt-4o-realtime 기반 wav-to-wav 대화.
--   기존 voice(Whisper+Claude+TTS), stenographer(타이핑 입력)는 유지.
--   기본값을 realtime으로 전환해 신규 세션이 자동으로 새 파이프라인 사용.

alter table public.sessions
  drop constraint if exists sessions_mode_check;

alter table public.sessions
  add constraint sessions_mode_check
  check (mode in ('voice', 'stenographer', 'realtime'));

alter table public.sessions
  alter column mode set default 'realtime';
