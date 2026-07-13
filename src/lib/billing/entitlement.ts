// 사용자의 현재 플랜/권한을 판별한다. service_role 로 subscriptions 를 읽는다
// (webhook 이 유지하는 진실 소스). 구독이 없으면 free 로 취급.
import { supabase } from "@/lib/db/supabase";
import { PLANS, isEntitledStatus, type PlanConfig, type PlanId } from "./plans";

export interface Entitlement {
  plan: PlanId;
  status: string;
  /** 유료 권한 활성(active|trialing 이고 free 가 아님). */
  entitled: boolean;
  config: PlanConfig;
}

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  const status = (data?.status as string) ?? "inactive";
  const rawPlan = (data?.plan as PlanId) ?? "free";
  const entitled = rawPlan !== "free" && isEntitledStatus(status);
  // 권한이 없으면(만료·미결제) 기능상 free 로 다운그레이드.
  const plan: PlanId = entitled ? rawPlan : "free";

  return { plan, status, entitled, config: PLANS[plan] };
}
