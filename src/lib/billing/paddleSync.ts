// Paddle 구독 상태 → subscriptions 테이블 동기화 (webhook 이 호출).
import type { Subscription } from "@paddle/paddle-node-sdk";
import { planForPaddlePriceId } from "./plans";
import { supabase } from "@/lib/db/supabase";

/** Paddle Subscription 객체를 우리 DB 로 upsert. customer→user 매핑 포함. */
export async function upsertFromPaddleSubscription(sub: Subscription): Promise<void> {
  // user 매핑: ① 체크아웃 때 실어 보낸 custom_data.user_id ② 우리 테이블의 customer 매핑.
  let userId =
    (sub.customData as Record<string, unknown> | null)?.user_id as string | undefined | null;

  if (!userId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("paddle_customer_id", sub.customerId)
      .maybeSingle();
    userId = (data?.user_id as string | undefined) ?? null;
  }
  if (!userId) return; // 매핑 실패 시 조용히 무시(외부/중복 이벤트 방지).

  const priceId = sub.items[0]?.price?.id;
  const plan = planForPaddlePriceId(priceId);

  // 기간 종료: 청구 주기 끝 → 없으면(체험 중 등) 다음 청구 시점.
  const endIso = sub.currentBillingPeriod?.endsAt ?? sub.nextBilledAt ?? null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_customer_id: sub.customerId,
      paddle_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_end: endIso,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
