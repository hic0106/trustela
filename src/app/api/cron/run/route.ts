// GET /api/cron/run — 등록된(active) 추적 프롬프트를 자동 실행하고 결과를 저장.
// Vercel Cron 이 스케줄에 맞춰 호출한다. CRON_SECRET 이 설정돼 있으면
// Vercel 은 `Authorization: Bearer <CRON_SECRET>` 헤더를 자동으로 붙인다.
import { runPromptAnalysis } from "@/lib/pipeline/runPromptAnalysis";
import { saveAnalysis } from "@/lib/db/saveAnalysis";
import { supabase } from "@/lib/db/supabase";
import type { Brand, EngineId } from "@/lib/types";

// 엔진 호출은 프롬프트당 수십 초. Hobby 60초 한도 → 한 번에 소수만 처리하고
// last_run_at 오래된 순으로 돌려 여러 번의 실행에 걸쳐 전체를 커버한다.
export const maxDuration = 60;
const MAX_PER_RUN = 3;

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return unauthorized();
  }

  // 오래 안 돌린 것부터 (null=한 번도 안 돌린 것 우선).
  const { data, error } = await supabase
    .from("tracked_prompts")
    .select("*")
    .eq("active", true)
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(MAX_PER_RUN);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results: { id: string; prompt: string; ok: boolean; error?: string }[] = [];

  for (const tp of data ?? []) {
    const row = tp as Record<string, unknown>;
    try {
      const result = await runPromptAnalysis({
        prompt: row.prompt as string,
        brands: (row.brands as Brand[]) ?? [],
        selfBrandId: row.self_brand_id as string,
        engines: (row.engines as EngineId[]) ?? [],
        classify: (row.classify as boolean) === true,
      });
      await saveAnalysis(row.prompt as string, result);
      await supabase
        .from("tracked_prompts")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", row.id as string);
      results.push({ id: row.id as string, prompt: row.prompt as string, ok: true });
    } catch (err) {
      results.push({
        id: row.id as string,
        prompt: row.prompt as string,
        ok: false,
        error: (err as Error).message,
      });
    }
  }

  return Response.json({ ran: results.length, results });
}
