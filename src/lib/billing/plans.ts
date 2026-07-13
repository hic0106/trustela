// 플랜 정의 — 결제 티어를 실제 사용 한도에 연결한다.
// (frequency/cap 메커니즘은 이미 존재; 여기서 플랜별로 바인딩만.)
import type { RunFrequency } from "@/lib/types";

export type PlanId = "free" | "starter" | "growth" | "pro";

export interface PlanConfig {
  id: PlanId;
  label: string;
  /** 자동 실행(추적) 프롬프트 최대 개수. free=0 → 자동 실행 불가. */
  trackedCap: number;
  /** 등록 가능한 실행 주기. free 는 없음(자동 실행 불가). */
  frequencies: RunFrequency[];
  /** 월 수동 분석 허용 횟수. 유료는 사실상 무제한(Infinity). */
  manualPerMonth: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free:    { id: "free",    label: "Free",    trackedCap: 0,   frequencies: [],                  manualPerMonth: 5 },
  starter: { id: "starter", label: "Starter", trackedCap: 10,  frequencies: ["weekly"],           manualPerMonth: Infinity },
  growth:  { id: "growth",  label: "Growth",  trackedCap: 50,  frequencies: ["weekly", "daily"], manualPerMonth: Infinity },
  pro:     { id: "pro",     label: "Pro",     trackedCap: 200, frequencies: ["weekly", "daily"], manualPerMonth: Infinity },
};

/** 유료 플랜만(체크아웃 대상). */
export const PAID_PLANS: PlanId[] = ["starter", "growth", "pro"];

/** 플랜 → Stripe Price ID (env). 서버에서만 사용. */
export function priceIdForPlan(plan: PlanId): string | undefined {
  switch (plan) {
    case "starter": return process.env.STRIPE_PRICE_STARTER;
    case "growth":  return process.env.STRIPE_PRICE_GROWTH;
    case "pro":     return process.env.STRIPE_PRICE_PRO;
    default:        return undefined;
  }
}

/** Stripe Price ID → 플랜 (webhook 에서 구독의 플랜 판별). */
export function planForPriceId(priceId: string | undefined | null): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return "growth";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}

/** 구독 status 가 이용 권한이 있는 상태인가(체험 포함). */
export function isEntitledStatus(status: string): boolean {
  return status === "active" || status === "trialing";
}
