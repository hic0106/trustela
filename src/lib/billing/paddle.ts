// Paddle 서버 클라이언트 (Merchant of Record — Stripe 는 한국 사업자 미지원이라 전환).
// PADDLE_ENV=sandbox|production, PADDLE_API_KEY 로 초기화.
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

// 빌드 시 env 미설정 대비: placeholder 로 초기화하고, 라우트에서 실제 키 확인.
const apiKey = process.env.PADDLE_API_KEY || "pdl_placeholder_for_build";

export const paddle = new Paddle(apiKey, {
  environment:
    process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox,
});

export function paddleConfigured(): boolean {
  return !!process.env.PADDLE_API_KEY?.trim();
}

/** 결제 후 돌아올 앱 베이스 URL. env 우선, 없으면 요청 origin. */
export function appUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}
