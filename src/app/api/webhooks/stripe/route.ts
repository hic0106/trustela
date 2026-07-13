// POST /api/webhooks/stripe — Stripe 이벤트를 받아 구독 상태를 동기화한다.
// 서명 검증에 raw body 가 필요하므로 request.text() 로 원문을 읽는다.
import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { syncSubscriptionById, upsertFromStripeSubscription } from "@/lib/billing/sync";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return Response.json({ error: "서명 또는 시크릿 누락" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return Response.json({ error: `서명 검증 실패: ${(err as Error).message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscriptionById(subId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertFromStripeSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // 관심 없는 이벤트는 무시(200 으로 확인).
        break;
    }
  } catch (err) {
    // 동기화 실패는 500 으로 반환해 Stripe 가 재시도하게 한다.
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  return Response.json({ received: true });
}
