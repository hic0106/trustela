// POST /api/billing/portal — Stripe Customer Portal 세션 URL 반환(구독 관리/취소).
import { stripe, appUrl } from "@/lib/billing/stripe";
import { getUser } from "@/lib/supabase/server";
import { supabase } from "@/lib/db/supabase";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return Response.json({ error: "결제 내역이 없습니다. 먼저 플랜을 구독하세요." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: appUrl(request),
  });

  return Response.json({ url: session.url });
}
