-- 결제 프로세서 Stripe → Paddle 전환(Stripe 는 한국 사업자 미지원).
-- 기존 stripe_* 컬럼은 test 기록 보존용으로 남기고 paddle_* 를 추가한다.
alter table subscriptions add column if not exists paddle_customer_id text;
alter table subscriptions add column if not exists paddle_subscription_id text;

create index if not exists subscriptions_paddle_customer_idx on subscriptions (paddle_customer_id);
