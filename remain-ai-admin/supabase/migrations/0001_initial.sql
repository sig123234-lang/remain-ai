-- ─────────────────────────────────────────────
--  remAIn 어드민 — 초기 스키마 (Phase 1)
--  코어 5 테이블 + 기본 RLS
-- ─────────────────────────────────────────────

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
--  facilities — 시설
-- ─────────────────────────────────────────────
create table public.facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  admins — 관리자/진행자
--  Supabase Auth의 auth.users 1:1 매핑
-- ─────────────────────────────────────────────
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'admin' check (role in ('admin', 'facilitator', 'viewer')),
  facility_id uuid references public.facilities(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  members — 어르신 회원
-- ─────────────────────────────────────────────
create table public.members (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid not null references public.facilities(id) on delete restrict,
  name text not null,
  age int not null check (age >= 50 and age <= 120),
  cognitive_level text not null default 'normal' check (cognitive_level in ('normal', 'MCI', 'moderate')),

  -- 보호자
  guardian_name text,
  guardian_relation text,
  guardian_phone text,
  guardian_email text,
  kakao_channel_linked boolean not null default false,

  -- 임상 메타
  family_status jsonb,
  taboo_topics text[],

  -- 동의 (L1~L6)
  consent jsonb not null default '{"L1":true,"L2":true,"L3":true,"L4":false,"L5":true,"L6":false}'::jsonb,

  -- 운영 메타
  session_count int not null default 0,
  last_session_at timestamptz,
  in_active_session boolean not null default false,

  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_facility_idx on public.members(facility_id);
create index members_last_session_idx on public.members(last_session_at desc nulls last);

-- ─────────────────────────────────────────────
--  sessions — 회상치료 세션
-- ─────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.members(id) on delete cascade,
  session_number int not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'wrapup', 'force_end', 'post_processing', 'completed')),

  duration_minutes int not null default 0,
  turn_count int not null default 0,
  depth_level int not null default 1 check (depth_level between 1 and 4),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  treasure_detected boolean not null default false,
  risk_flagged boolean not null default false,

  main_topic text,
  topics text[],
  emotional_score int,

  -- v10 sessionState 전체 (마지막 상태)
  last_session_state jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index sessions_member_idx on public.sessions(member_id, session_number desc);
create index sessions_status_idx on public.sessions(status) where status in ('active', 'wrapup', 'force_end', 'post_processing');

-- ─────────────────────────────────────────────
--  conversation_turns — 대화 턴
-- ─────────────────────────────────────────────
create table public.conversation_turns (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  turn_index int not null,
  role text not null check (role in ('ai', 'elderly')),
  text text not null,
  timestamp_sec numeric(10, 2) not null default 0,
  duration_sec numeric(10, 2),

  -- 어르신 발화 메타
  stt_confidence numeric(4, 3),
  stt_low_confidence_words jsonb,
  stt_garbage_detected boolean not null default false,
  audio_features jsonb,

  -- AI 발화 메타 (v10 출력 전체)
  llm_structured jsonb,

  created_at timestamptz not null default now(),

  unique (session_id, turn_index)
);

create index turns_session_idx on public.conversation_turns(session_id, turn_index);

-- ─────────────────────────────────────────────
--  audio_files — 세션 음성 파일 (1:1)
-- ─────────────────────────────────────────────
create table public.audio_files (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  storage_path text,
  format text not null default 'webm' check (format in ('webm', 'mp3', 'm4a')),
  duration_sec int not null default 0,
  size_bytes bigint not null default 0,
  channels int not null default 1 check (channels in (1, 2)),
  sample_rate_hz int not null default 16000,
  stored boolean not null default false,
  consent_verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
--  updated_at 자동 트리거
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
