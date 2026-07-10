// GET /api/history?prompt=... — 특정 프롬프트의 과거 분석에서 브랜드별 SoV 시계열을 반환.
// 본인 데이터만(로그인 필요). RLS 로 user_id 필터가 자동 적용된다.
import { createClient, getUser } from "@/lib/supabase/server";
import type { AnalysisResult, HistoryPoint } from "@/lib/types";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt")?.trim();

  if (!prompt) {
    return Response.json({ error: "prompt 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    // 같은 프롬프트의 분석을 오래된 순으로(그래프 왼쪽→오른쪽). 최근 50개. RLS 로 본인 것만.
    const { data, error } = await supabase
      .from("analyses")
      .select("run_at, result")
      .eq("prompt", prompt)
      .order("run_at", { ascending: true })
      .limit(50);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const points: HistoryPoint[] = (data ?? []).map((row) => {
      const result = row.result as AnalysisResult;
      return {
        runAt: (row.run_at as string) ?? result.runAt,
        shareOfVoice: result.shareOfVoice ?? {},
      };
    });

    return Response.json({ points });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
