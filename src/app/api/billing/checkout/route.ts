// POST /api/billing/checkout { plan } — Paddle 오버레이 체크아웃에 필요한 값을 반환.
// 로그인 필요. 서버가 Paddle customer 를 준비(생성/재사용)하고,
// 클라이언트는 반환된 priceId·customerId 로 Paddle.js 오버레이를 연다.
// 14일 무료 체험은 Paddle Price 의 trial_period 로 설정되어 있다.
import { paddle, paddleConfigured } from "@/lib/billing/paddle";
import { getUser } from "@/lib/supabase/server";
import { supabase } from "@/lib/db/supabase";
import { PAID_PLANS, paddlePriceIdForPlan, type PlanId } from "@/lib/billing/plans";

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

  if (!paddleConfigured()) {
    return Response.json({ error: "Paddle 이 설정되지 않았습니다(서버 env)." }, { status: 500 });
  }
  const priceId = paddlePriceIdForPlan(plan);
  if (!priceId || !priceId.startsWith("pri_")) {
    return Response.json({ error: "Paddle Price ID 가 설정되지 않았습니다(서버 env)." }, { status: 500 });
  }

  // 기존 Paddle customer 재사용, 없으면 생성 후 저장.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.paddle_customer_id as string | undefined | null;
  if (!customerId) {
    try {
      const customer = await paddle.customers.create({
        email: user.email ?? `${user.id}@users.trustela.app`,
        customData: { user_id: user.id },
      });
      customerId = customer.id;
    } catch {
      // 같은 이메일의 customer 가 이미 있으면 생성이 거부된다 → 이메일로 조회해 재사용.
      if (user.email) {
        const existing = await paddle.customers.list({ email: [user.email] }).next();
        customerId = existing[0]?.id ?? null;
      }
    }
    if (!customerId) {
      return Response.json({ error: "Paddle customer 를 준비하지 못했습니다." }, { status: 502 });
    }
    await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, paddle_customer_id: customerId }, { onConflict: "user_id" });
  }

  return Response.json({
    priceId,
    customerId,
    userId: user.id, // 오버레이 customData 로 실어 webhook 매핑에 사용.
  });
}
