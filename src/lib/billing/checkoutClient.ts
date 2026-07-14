// 클라이언트 전용 — Paddle.js 오버레이 체크아웃을 연다.
// 흐름: POST /api/billing/checkout → { priceId, customerId, userId } → 오버레이.
// 결제 완료 시 /dashboard?billing=success 로 복귀(웹훅이 구독을 DB 에 반영).
import { initializePaddle, type Paddle } from "@paddle/paddle-js";

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return Promise.resolve(undefined);
    paddlePromise = initializePaddle({
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      token,
    });
  }
  return paddlePromise;
}

export interface CheckoutResult {
  ok: boolean;
  /** 401 → 로그인 필요(호출부에서 /login 이동). */
  loginRequired?: boolean;
  message?: string;
}

export async function startPlanCheckout(plan: "starter" | "growth" | "pro"): Promise<CheckoutResult> {
  let res: Response;
  try {
    res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
  } catch {
    return { ok: false, message: "Could not start checkout. Please try again." };
  }

  if (res.status === 401) return { ok: false, loginRequired: true };

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.priceId) {
    return { ok: false, message: data.message ?? data.error ?? "Could not start checkout." };
  }

  const paddleJs = await getPaddle();
  if (!paddleJs) {
    return { ok: false, message: "Checkout is not configured (client token missing)." };
  }

  paddleJs.Checkout.open({
    items: [{ priceId: data.priceId as string, quantity: 1 }],
    customer: { id: data.customerId as string },
    customData: { user_id: data.userId as string },
    settings: {
      displayMode: "overlay",
      successUrl: `${window.location.origin}/dashboard?billing=success`,
    },
  });
  return { ok: true };
}
