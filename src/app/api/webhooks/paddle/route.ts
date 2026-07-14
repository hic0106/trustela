// POST /api/webhooks/paddle — Paddle 이벤트를 받아 구독 상태를 동기화한다.
// 서명 검증(Paddle-Signature, HMAC)에 raw body 가 필요하므로 request.text() 로 읽는다.
import { EventName, type Subscription } from "@paddle/paddle-node-sdk";
import { paddle } from "@/lib/billing/paddle";
import { upsertFromPaddleSubscription } from "@/lib/billing/paddleSync";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return Response.json({ error: "서명 또는 시크릿 누락" }, { status: 400 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(body, secret, signature);
  } catch (err) {
    return Response.json(
      { error: `서명 검증 실패: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionCanceled: {
        await upsertFromPaddleSubscription(event.data as Subscription);
        break;
      }
      default:
        // 관심 없는 이벤트는 무시(200 으로 확인).
        break;
    }
  } catch (err) {
    // 동기화 실패는 500 으로 반환해 Paddle 이 재시도하게 한다.
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }

  return Response.json({ received: true });
}
