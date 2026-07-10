// 분석 결과를 Supabase에 저장하는 공용 헬퍼 (/api/analyze 와 cron 이 함께 사용).
import { supabase } from "./supabase";
import type { AnalysisResult } from "../types";

/**
 * 분석 결과를 analyses(원본 jsonb) + mentions(브랜드별 SoV) 테이블에 저장.
 * service_role 클라이언트로 쓰며 소유자(userId)를 명시적으로 스탬프한다.
 * 저장에 실패해도 throw 하지 않고 false 를 반환한다(호출부가 분석 자체는 계속 진행하도록).
 *
 * @param userId 결과를 귀속시킬 사용자 id. 익명 실행 등 소유자가 없으면 null.
 */
export async function saveAnalysis(
  prompt: string,
  result: AnalysisResult,
  userId: string | null = null,
): Promise<boolean> {
  try {
    const { data: analysis, error: insertError } = await supabase
      .from("analyses")
      .insert({ prompt, run_at: result.runAt, result, user_id: userId })
      .select()
      .single();

    if (insertError || !analysis) return false;

    const mentions = Object.entries(result.shareOfVoice).map(([brandId, sov]) => ({
      analysis_id: analysis.id,
      user_id: userId,
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
