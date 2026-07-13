// Stripe 서버 클라이언트. STRIPE_SECRET_KEY(test 모드부터) 로 초기화.
import Stripe from "stripe";

// 빌드 시 env 미설정 대비: placeholder로 초기화하고, 라우트에서 실제 키 확인.
const key = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build";
export const stripe = new Stripe(key);

/** 결제 후 돌아올 앱 베이스 URL. env 우선, 없으면 요청 origin. */
export function appUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
}
