// 스케줄러가 자동 실행할 "추적 프롬프트" 관리.
//   GET    /api/tracked         → 등록 목록
//   POST   /api/tracked         → 등록(현재 분석 설정 저장)
//   DELETE /api/tracked?id=...  → 등록 해제
import { supabase } from "@/lib/db/supabase";
import type { Brand, EngineId, RunFrequency, TrackedPrompt } from "@/lib/types";

const ALLOWED_ENGINES: EngineId[] = ["chatgpt", "perplexity", "gemini"];
const ALLOWED_FREQUENCIES: RunFrequency[] = ["daily", "weekly"];

// 등록 가능한 활성 프롬프트 총 상한 (Pro 플랜 한도 + 베타 원가 안전장치).
// 계정/결제가 붙기 전까지는 전역 상한으로 폭주를 막는다. 필요시 env 로 조정.
const MAX_ACTIVE_PROMPTS = Number(process.env.MAX_ACTIVE_PROMPTS) || 200;

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
    frequency: ((row.frequency as RunFrequency) ?? "weekly"),
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
    frequency?: unknown;
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

  // 주기: 미지정/무효 시 원가 안전상 weekly 로 폴백.
  const frequency: RunFrequency = ALLOWED_FREQUENCIES.includes(b.frequency as RunFrequency)
    ? (b.frequency as RunFrequency)
    : "weekly";

  // 활성 프롬프트 총 상한 검사 (Pro 한도 / 베타 원가 폭주 방지).
  const { count, error: countError } = await supabase
    .from("tracked_prompts")
    .select("*", { count: "exact", head: true })
    .eq("active", true);
  if (countError) return Response.json({ error: countError.message }, { status: 500 });
  if ((count ?? 0) >= MAX_ACTIVE_PROMPTS) {
    return Response.json(
      { error: `자동 실행 프롬프트 한도(${MAX_ACTIVE_PROMPTS}개)에 도달했습니다. 기존 항목을 지우거나 상위 플랜이 필요합니다.` },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("tracked_prompts")
    .insert({
      prompt: b.prompt.trim(),
      self_brand_id: b.selfBrandId,
      brands,
      engines,
      classify: b.classify === true,
      active: true,
      frequency,
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
