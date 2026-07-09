// 분석 결과를 Supabase에 저장하는 공용 헬퍼 (/api/analyze 와 cron 이 함께 사용).
import { supabase } from "./supabase";
import type { AnalysisResult } from "../types";

/**
 * 분석 결과를 analyses(원본 jsonb) + mentions(브랜드별 SoV) 테이블에 저장.
 * 저장에 실패해도 throw 하지 않고 false 를 반환한다(호출부가 분석 자체는 계속 진행하도록).
 */
export async function saveAnalysis(
  prompt: string,
  result: AnalysisResult,
): Promise<boolean> {
  try {
    const { data: analysis, error: insertError } = await supabase
      .from("analyses")
      .insert({ prompt, run_at: result.runAt, result })
      .select()
      .single();

    if (insertError || !analysis) return false;

    const mentions = Object.entries(result.shareOfVoice).map(([brandId, sov]) => ({
      analysis_id: analysis.id,
      brand_id: brandId,
      mentioned: (result.mentionCounts[brandId] ?? 0) > 0,
      rank:
        result.perEngine[0]?.mentions.find((m) => m.brandId === brandId)?.rank ?? null,
      share_of_voice: sov,
    }));

    await supabase.from("mentions").insert(mentions);
    return true;
  } catch (err) {
    console.error("saveAnalysis failed:", err);
    return false;
  }
}
