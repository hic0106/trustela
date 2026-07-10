-- 계정 도입: 데이터 소유권(user_id) + RLS.
-- service_role(cron·saveAnalysis 쓰기)은 RLS 를 우회하므로 별도 insert 정책 없이도 동작한다.
-- 유저 스코프 클라이언트(anon 키 + 세션 JWT)의 읽기/관리는 아래 정책으로 본인 데이터만 접근.

-- 1) user_id 컬럼 (auth.users 참조, 계정 삭제 시 데이터도 정리).
alter table tracked_prompts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table analyses       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table mentions        add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2) 조회 성능 인덱스 (history: 유저+프롬프트+시간순).
create index if not exists analyses_user_prompt_idx on analyses (user_id, prompt, run_at);
create index if not exists tracked_user_idx on tracked_prompts (user_id);

-- 3) RLS 활성화.
alter table tracked_prompts enable row level security;
alter table analyses       enable row level security;
alter table mentions        enable row level security;

-- 4) 정책 — 본인(auth.uid()) 데이터만.
--    tracked_prompts 는 유저 스코프 클라이언트로 CRUD 하므로 for all.
drop policy if exists "own tracked" on tracked_prompts;
create policy "own tracked" on tracked_prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

--    analyses·mentions 는 읽기만 유저 스코프(쓰기는 service_role).
drop policy if exists "own analyses read" on analyses;
create policy "own analyses read" on analyses
  for select using (auth.uid() = user_id);

drop policy if exists "own mentions read" on mentions;
create policy "own mentions read" on mentions
  for select using (auth.uid() = user_id);

-- 참고: 기존 test 행들은 user_id 가 null 이라 RLS 하에서 아무에게도 안 보인다(의도된 격리).
