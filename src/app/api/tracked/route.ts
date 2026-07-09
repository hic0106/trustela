// 스케줄러가 자동 실행할 "추적 프롬프트" 관리.
//   GET    /api/tracked         → 등록 목록
//   POST   /api/tracked         → 등록(현재 분석 설정 저장)
//   DELETE /api/tracked?id=...  → 등록 해제
import { supabase } from "@/lib/db/supabase";
import type { Brand, EngineId, TrackedPrompt } from "@/lib/types";

const ALLOWED_ENGINES: EngineId[] = ["chatgpt", "perplexity", "gemini"];

// DB(snake_case) → 클라이언트(camelCase) 매핑.
function toClient(row: Record<string, unknown>): TrackedPrompt {
  return {
    id: row.id as string,
    prompt: row.prompt as string,
    selfBrandId: row.self_brand_id as string,
    brands: (row.brands as Brand[]) ?? [],
    engines: (row.engines as EngineId[]) ?? [],
    classify: (row.classify as boolean) ?? true,
    active: (row.active as boolean) ?? true,
    lastRunAt: (row.last_run_at as string | null) ?? null,
  };
}

function bad(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET() {
  const { data, error } = await supabase
    .from("tracked_prompts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tracked: (data ?? []).map(toClient) });
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
    selfBrandId?: unknown;
    brands?: unknown;
    engines?: unknown;
    classify?: unknown;
  };

  if (typeof b.prompt !== "string" || !b.prompt.trim()) return bad("prompt(문자열)이 필요합니다.");
  if (!Array.isArray(b.brands) || b.brands.length === 0) return bad("brands(배열)가 필요합니다.");

  const brands: Brand[] = [];
  for (const raw of b.brands) {
    const r = raw as { id?: unknown; name?: unknown; aliases?: unknown };
    if (typeof r.id !== "string" || typeof r.name !== "string") {
      return bad("각 brand 는 id·name(문자열)이 필요합니다.");
    }
    brands.push({
      id: r.id,
      name: r.name,
      aliases: Array.isArray(r.aliases) ? r.aliases.filter((a): a is string => typeof a === "string") : [],
    });
  }

  if (typeof b.selfBrandId !== "string" || !brands.some((x) => x.id === b.selfBrandId)) {
    return bad("selfBrandId 는 brands 안의 id 여야 합니다.");
  }

  const engines = Array.isArray(b.engines)
    ? (b.engines.filter(
        (e): e is EngineId => typeof e === "string" && ALLOWED_ENGINES.includes(e as EngineId),
      ) as EngineId[])
    : [];
  if (engines.length === 0) return bad("engines 는 최소 하나여야 합니다.");

  const { data, error } = await supabase
    .from("tracked_prompts")
    .insert({
      prompt: b.prompt.trim(),
      self_brand_id: b.selfBrandId,
      brands,
      engines,
      classify: b.classify === true,
      active: true,
    })
    .select()
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? "저장 실패" }, { status: 500 });
  }
  return Response.json({ tracked: toClient(data) });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("id 쿼리 파라미터가 필요합니다.");
  const { error } = await supabase.from("tracked_prompts").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
