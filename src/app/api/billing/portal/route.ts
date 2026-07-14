// POST /api/billing/portal — Paddle Customer Portal 세션 URL 반환(구독 관리/취소).
import { paddle, paddleConfigured } from "@/lib/billing/paddle";
import { getUser } from "@/lib/supabase/server";
import { supabase } from "@/lib/db/supabase";

export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  if (!paddleConfigured()) {
    return Response.json({ error: "Paddle 이 설정되지 않았습니다(서버 env)." }, { status: 500 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = sub?.paddle_customer_id as string | undefined | null;
  if (!customerId) {
    return Response.json({ error: "결제 내역이 없습니다. 먼저 플랜을 구독하세요." }, { status: 400 });
  }

  const subscriptionId = sub?.paddle_subscription_id as string | undefined | null;
  const session = await paddle.customerPortalSessions.create(
    customerId,
    subscriptionId ? [subscriptionId] : [],
  );

  return Response.json({ url: session.urls.general.overview });
}
