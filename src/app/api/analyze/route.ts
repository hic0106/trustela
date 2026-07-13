// POST /api/analyze — 프롬프트를 엔진들에 돌려 SoV·순위·(옵션)전환형 인용을 반환.
// 로그인 사용자: 결과를 본인 소유로 저장. 익명: 무료 1회만 허용(쿠키), 그 뒤엔 로그인 요구.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { runPromptAnalysis } from "@/lib/pipeline/runPromptAnalysis";
import { saveAnalysis } from "@/lib/db/saveAnalysis";
import { getUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/billing/entitlement";
import { supabase } from "@/lib/db/supabase";
import type { Brand, EngineId, AnalysisResult } from "@/lib/types";

// 엔진 호출 + 분류는 수십 초 걸릴 수 있다.
// Vercel Hobby 는 함수 최대 60초 → 그 한도에 맞춘다(초과 시 엔진/분류 줄이기).
export const maxDuration = 60;

const ALLOWED_ENGINES: EngineId[] = ["chatgpt", "perplexity", "gemini"];
// 익명 무료 1회 소진 표시 쿠키. 로그인 없이 이 값이 있으면 추가 실행 차단.
const FREE_COOKIE = "tl_free_used";
const FREE_MAX_AGE = 60 * 60 * 24 * 30; // 30일

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("JSON 본문을 파싱할 수 없습니다.");
  }

  const b = body as {
    prompt?: unknown;
    brands?: unknown;
    selfBrandId?: unknown;
    engines?: unknown;
    classify?: unknown;
  };

  if (typeof b.prompt !== "string" || !b.prompt.trim()) {
    return bad("prompt(문자열)이 필요합니다.");
  }
  if (!Array.isArray(b.brands) || b.brands.length === 0) {
    return bad("brands(배열)가 필요합니다.");
  }

  const brands: Brand[] = [];
  for (const raw of b.brands) {
    const r = raw as { id?: unknown; name?: unknown; aliases?: unknown };
    if (typeof r.id !== "string" || typeof r.name !== "string") {
      return bad("각 brand 는 id·name(문자열)이 필요합니다.");
    }
    brands.push({
      id: r.id,
      name: r.name,
      aliases: Array.isArray(r.aliases)
        ? r.aliases.filter((a): a is string => typeof a === "string")
        : [],
    });
  }

  if (typeof b.selfBrandId !== "string" || !brands.some((x) => x.id === b.selfBrandId)) {
    return bad("selfBrandId 는 brands 안의 id 여야 합니다.");
  }

  const engines: EngineId[] = Array.isArray(b.engines)
    ? (b.engines.filter(
        (e): e is EngineId => typeof e === "string" && ALLOWED_ENGINES.includes(e as EngineId),
      ) as EngineId[])
    : [];
  if (engines.length === 0) {
    return bad("engines 는 chatgpt·perplexity 중 최소 하나여야 합니다.");
  }

  const user = await getUser();

  // 익명 사용자: 무료 1회만. 이미 소진했으면 로그인 요구(비용 통제).
  if (!user) {
    const cookieStore = await cookies();
    if (cookieStore.get(FREE_COOKIE)) {
      return Response.json(
        {
          error: "login_required",
          message: "Your free analysis is used. Log in to keep analyzing.",
        },
        { status: 401 },
      );
    }
  } else {
    // 로그인 사용자: 유료면 무제한, free(미결제)면 월 수동 분석 한도 적용.
    const ent = await getEntitlement(user.id);
    const limit = ent.config.manualPerMonth;
    if (Number.isFinite(limit)) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("run_at", monthStart.toISOString());
      if ((count ?? 0) >= limit) {
        return Response.json(
          {
            error: "upgrade_required",
            message: `Your free plan includes ${limit} analyses per month. Upgrade for unlimited.`,
          },
          { status: 402 },
        );
      }
    }
  }

  try {
    const result: AnalysisResult = await runPromptAnalysis({
      prompt: b.prompt.trim(),
      brands,
      selfBrandId: b.selfBrandId,
      engines,
      classify: b.classify === true,
    });

    if (user) {
      // 로그인 사용자: 본인 소유로 저장(실패해도 결과는 반환 — 비차단).
      await saveAnalysis(b.prompt.trim(), result, user.id);
      return Response.json(result);
    }

    // 익명 무료 실행: 소유자가 없으니 저장하지 않고, 무료 소진 쿠키만 심는다.
    const res = NextResponse.json(result);
    res.cookies.set(FREE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: FREE_MAX_AGE,
    });
    return res;
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
