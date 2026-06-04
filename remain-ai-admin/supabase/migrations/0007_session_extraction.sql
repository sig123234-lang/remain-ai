-- 세션 종료 후 Claude로 추출한 구조화 결과 저장.
-- jsonb 단일 컬럼으로 keyMemories, treasures, entities, guardianReport, reportStatus 등을 묶어 보관.
-- 별도 테이블로 정규화는 v2에서 — 지금은 read-heavy/append-once 워크로드라 단일 jsonb면 충분.

alter table public.sessions
  add column if not exists extraction jsonb;

create index if not exists sessions_has_extraction_idx
  on public.sessions ((extraction is not null))
  where extraction is not null;
