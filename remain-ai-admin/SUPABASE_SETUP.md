# Supabase 셋업 가이드 — Phase 1

이 문서는 어드민 앱을 처음 실제 DB에 연결하는 단계입니다.

## 1. Supabase 프로젝트 생성

1. https://supabase.com 접속 → New Project
2. 프로젝트 이름: `remain-ai-admin` (또는 원하는 이름)
3. 지역: **Northeast Asia (Seoul)** 추천
4. 비밀번호 안전한 곳에 저장

생성 완료까지 1~2분.

## 2. API 키 복사

프로젝트 대시보드 → Settings → API에서 세 가지 값:

| 변수 | 위치 | 용도 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 클라이언트/서버 공통 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon · public | 브라우저 노출 OK (RLS로 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role · secret | 서버 전용 — RLS 우회, 절대 브라우저 노출 금지 |

## 3. `.env.local` 작성

프로젝트 루트(`remain-ai-admin/`)에서:

```bash
cp .env.local.example .env.local
```

`.env.local`에 위 세 키를 붙여넣기.

## 4. 마이그레이션 실행

Supabase 대시보드 → SQL Editor → New query에서 차례로 실행:

1. **`supabase/migrations/0001_initial.sql`** — 코어 테이블 5개 생성
2. **`supabase/migrations/0002_rls.sql`** — Row Level Security 정책

각 파일 내용을 통째로 복사해 붙여넣고 **Run**.

## 5. 시드 데이터 삽입

같은 SQL Editor에서 **`supabase/seed.sql`** 실행 → 시설 3곳 + 회원 16명.

## 6. 어드민 사용자 생성

1. Supabase 대시보드 → **Authentication** → **Users** → **Add user**
2. **Add user via email** 선택
3. 이메일 + 비밀번호 입력 → **Create user**
4. 생성된 사용자의 **UID** 복사 (Users 리스트에서)
5. SQL Editor로 돌아가 다음 실행:

```sql
insert into public.admins (id, email, name, role, facility_id) values
  ('PASTE-USER-UUID-HERE',
   'admin@example.com',
   '관리자',
   'admin',
   '00000000-0000-0000-0000-000000000001');
```

→ 이 admin은 한울요양원 A동 회원 7명만 보임 (RLS).

다른 시설 어드민도 추가하려면 `facility_id`만 바꿔서 같은 식으로 INSERT.

## 7. 앱 재시작 + 로그인

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속:
- 자동으로 `/login`으로 리다이렉트
- 위에서 만든 이메일/비밀번호로 로그인
- `/members` 페이지에서 자기 시설 회원만 보이면 성공

상단에 "개발 모드 (mock 데이터)" 노란 배너가 사라졌다면 DB 연결 성공.

## 트러블슈팅

**"Invalid login credentials"** — Authentication에서 비밀번호 다시 확인 / 이메일 확인 메일이 안 갔으면 Settings에서 "Confirm email" 끄거나 직접 confirm.

**회원이 안 보임** — admins 테이블에 본인 row가 들어갔는지 확인. facility_id가 회원의 facility_id와 일치해야 함.

**모든 페이지가 mock 데이터로 보임** — `.env.local`에 값이 제대로 들어갔는지 + dev 서버를 한 번 껐다 켰는지 확인.

## Phase 1 한계 (Phase 2~에서 해결)

- 다른 페이지(세션·리포트·청취·아카이브)는 아직 mock 그대로
- 회원 등록 (신규 등록) — 아직 DB 반영 안 됨
- 음성 파일 Storage — Phase 4
- LLM API 연동 — Phase 3
- 실시간 세션 — Phase 4
