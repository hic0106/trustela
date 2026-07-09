// 파이프라인 통합 (PRD E2~E4): 프롬프트 → 엔진 실행 → 언급 탐지 → Share of Voice.
// 커넥터·파서·SoV 조각을 하나로 꿰어 "누가 몇 위로 추천됐고 자사 SoV는 얼마인가"를 낸다.

import type {
  AnalysisResult,
  Brand,
  EngineAnalysis,
  EngineId,
} from "../types";
import { getConnector } from "../engines/connector";
import { detectMentions } from "../parsing/detectMentions";
import { shareOfVoice } from "../metrics/shareOfVoice";

export interface AnalysisInput {
  prompt: string;
  /** 자사 + 경쟁사 브랜드. */
  brands: Brand[];
  /** brands 중 자사 브랜드의 id. */
  selfBrandId: string;
  /** 실행할 엔진들. */
  engines: EngineId[];
}

/** 한 엔진을 실행하고 언급까지 탐지. 실패해도 error 로 담아 반환(전체는 계속). */
async function analyzeEngine(
  engine: EngineId,
  input: AnalysisInput,
): Promise<EngineAnalysis> {
  try {
    const result = await getConnector(engine).run(input.prompt);
    return {
      engine,
      model: result.model,
      mentions: detectMentions(result.text, input.brands, result.citations),
      citations: result.citations,
    };
  } catch (err) {
    return {
      engine,
      model: "",
      mentions: [],
      citations: [],
      error: (err as Error).message,
    };
  }
}

export async function runPromptAnalysis(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  const runAt = new Date().toISOString();

  // 엔진들을 병렬 실행.
  const perEngine = await Promise.all(
    input.engines.map((e) => analyzeEngine(e, input)),
  );

  // 브랜드별 언급 엔진 수 + 최고 순위 집계.
  const mentionCounts: Record<string, number> = {};
  const bestRank: Record<string, number | null> = {};
  for (const brand of input.brands) {
    mentionCounts[brand.id] = 0;
    bestRank[brand.id] = null;
  }
  for (const ea of perEngine) {
    for (const m of ea.mentions) {
      if (!m.mentioned) continue;
      mentionCounts[m.brandId] += 1;
      if (m.rank !== null) {
        const cur = bestRank[m.brandId];
        bestRank[m.brandId] = cur === null ? m.rank : Math.min(cur, m.rank);
      }
    }
  }

  const sov = shareOfVoice(mentionCounts);

  // SoV 최상위 브랜드 (등록 순서를 tiebreak 로).
  let topBrandId: string | null = null;
  let topSov = 0;
  for (const brand of input.brands) {
    if (sov[brand.id] > topSov) {
      topSov = sov[brand.id];
      topBrandId = brand.id;
    }
  }

  return {
    prompt: input.prompt,
    runAt,
    perEngine,
    mentionCounts,
    shareOfVoice: sov,
    topBrandId,
    self: {
      brandId: input.selfBrandId,
      mentionedInEngines: mentionCounts[input.selfBrandId] ?? 0,
      shareOfVoice: sov[input.selfBrandId] ?? 0,
      bestRank: bestRank[input.selfBrandId] ?? null,
    },
  };
}
