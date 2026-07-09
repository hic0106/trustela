// POST /api/analyze — 프롬프트를 엔진들에 돌려 SoV·순위·(옵션)전환형 인용을 반환 + Supabase에 저장.
import { runPromptAnalysis } from "@/lib/pipeline/runPromptAnalysis";
import { supabase } from "@/lib/db/supabase";
import type { Brand, EngineId, AnalysisResult } from "@/lib/types";

// 엔진 호출 + 분류는 수십 초 걸릴 수 있다.
// Vercel Hobby 는 함수 최대 60초 → 그 한도에 맞춘다(초과 시 엔진/분류 줄이기).
export const maxDuration = 60;

const ALLOWED_ENGINES: EngineId[] = ["chatgpt", "perplexity", "gemini"];

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

  try {
    const result: AnalysisResult = await runPromptAnalysis({
      prompt: b.prompt.trim(),
      brands,
      selfBrandId: b.selfBrandId,
      engines,
      classify: b.classify === true,
    });

    // Supabase에 저장 (백그라운드, 실패해도 결과는 반환)
    try {
      const { data: analysis, error: insertError } = await supabase
        .from("analyses")
        .insert({
          prompt: b.prompt.trim(),
          run_at: result.runAt,
          result: result,
        })
        .select()
        .single();

      if (!insertError && analysis) {
        // 브랜드별 mention 데이터 저장
        const mentions = Object.entries(result.shareOfVoice).map(
          ([brandId, sov]) => ({
            analysis_id: analysis.id,
            brand_id: brandId,
            mentioned: (result.mentionCounts[brandId] ?? 0) > 0,
            rank:
              result.perEngine[0]?.mentions.find((m) => m.brandId === brandId)
                ?.rank ?? null,
            share_of_voice: sov,
          })
        );

        await supabase.from("mentions").insert(mentions);
      }
    } catch (dbErr) {
      console.error("DB operation failed:", dbErr);
      // DB 오류는 사용자에게 알리지 않음 (분석 결과는 반환)
    }

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
