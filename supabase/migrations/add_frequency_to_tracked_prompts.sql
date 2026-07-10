-- tracked_prompts 에 실행 주기 컬럼 추가 (Starter=weekly / Pro=daily 차등).
-- 기존 행은 원가 안전상 weekly 로 채운다.
alter table tracked_prompts
  add column if not exists frequency text not null default 'weekly'
  check (frequency in ('daily', 'weekly'));
