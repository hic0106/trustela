// POST /api/billing/checkout { plan } — 유료 플랜 결제 세션을 만들고 URL 을 반환.
// 로그인 필요. 14일 무료 체험(카드 등록) 포함. 성공/취소 시 앱으로 복귀.
import { stripe, appUrl } from "@/lib/billing/stripe";
import { getUser } from "@/lib/supabase/server";
import { supabase } from "@/lib/db/supabase";
import { PAID_PLANS, priceIdForPlan, type PlanId } from "@/lib/billing/plans";

const TRIAL_DAYS = 14;

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: { plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 본문을 파싱할 수 없습니다." }, { status: 400 });
  }

  const plan = body.plan as PlanId;
  if (!PAID_PLANS.includes(plan)) {
    return Response.json({ error: "유효한 유료 플랜이 아닙니다." }, { status: 400 });
  }

  const price = priceIdForPlan(plan);
  if (!price || price.startsWith("price_") === false || price.includes("_here")) {
    return Response.json({ error: "Stripe Price ID 가 설정되지 않았습니다(서버 env)." }, { status: 500 });
  }

  // 기존 Stripe customer 재사용, 없으면 생성 후 저장.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const base = appUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { trial_period_days: TRIAL_DAYS },
    client_reference_id: user.id,
    allow_promotion_codes: true,
    success_url: `${base}/?billing=success`,
    cancel_url: `${base}/#pricing`,
  });

  return Response.json({ url: session.url });
}
