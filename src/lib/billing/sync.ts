// Stripe 구독 상태 → subscriptions 테이블 동기화 (webhook 이 호출).
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { planForPriceId } from "./plans";
import { supabase } from "@/lib/db/supabase";

/** 구독 id 로 최신 상태를 가져와 반영. */
export async function syncSubscriptionById(subscriptionId: string): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertFromStripeSubscription(sub);
}

/** Stripe Subscription 객체를 우리 DB 로 upsert. customer→user 매핑 포함. */
export async function upsertFromStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // customer → user_id: 먼저 우리 테이블(체크아웃 때 저장), 없으면 customer metadata.
  let userId: string | null = null;
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  userId = (data?.user_id as string | undefined) ?? null;

  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!("deleted" in customer && customer.deleted)) {
      userId = (customer as Stripe.Customer).metadata?.user_id ?? null;
    }
  }
  if (!userId) return; // 매핑 실패 시 조용히 무시(중복/외부 이벤트 방지).

  const priceId = sub.items.data[0]?.price.id;
  const plan = planForPriceId(priceId);

  // current_period_end 는 Stripe API 버전에 따라 구독 또는 아이템에 위치 → 방어적으로 추출.
  const anySub = sub as unknown as {
    current_period_end?: number;
    items: { data: Array<{ current_period_end?: number }> };
  };
  const endUnix = anySub.current_period_end ?? anySub.items.data[0]?.current_period_end;
  const periodEnd = endUnix ? new Date(endUnix * 1000).toISOString() : null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
