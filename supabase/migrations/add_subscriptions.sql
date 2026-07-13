-- 결제(Stripe) 구독 상태 저장. webhook 이 진실 소스로 유지한다.
-- 쓰기는 service_role(webhook)만 → RLS 로 읽기만 본인 것 허용.
create table if not exists subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',        -- free | starter | growth | pro
  status text not null default 'inactive',  -- active | trialing | past_due | canceled | inactive
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

create index if not exists subscriptions_customer_idx on subscriptions (stripe_customer_id);

alter table subscriptions enable row level security;

drop policy if exists "own subscription read" on subscriptions;
create policy "own subscription read" on subscriptions
  for select using (auth.uid() = user_id);
