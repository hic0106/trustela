// Trustela 도메인 핵심 타입 (Phase 1)

/** Phase 1 우선 지원 엔진. 3번째(gemini)는 도입 결정 대기. */
export type EngineId = "chatgpt" | "perplexity" | "gemini";

/** 추적 대상 브랜드(자사·경쟁사 공통). aliases 로 별칭 매칭. */
export interface Brand {
  id: string;
  name: string;
  aliases: string[];
}

/** 사용자가 등록한 추적 프롬프트. */
export interface Prompt {
  id: string;
  text: string;
}

/** 엔진 커넥터가 프롬프트 1회 실행으로 돌려주는 결과. */
export interface EngineResult {
  engine: EngineId;
  /** 실제 호출된 모델명 (예: "sonar", "gpt-4o"). */
  model: string;
  /** 합성된 답변 텍스트. */
  text: string;
  /** 답변이 참조한 출처 URL들 (없으면 빈 배열). */
  citations: string[];
}

/** 한 엔진에 프롬프트를 1회 실행한 원본 결과(저장용). */
export interface EngineRun {
  promptId: string;
  engine: EngineId;
  runAt: string; // ISO8601
  rawResponse: string;
  citations: string[];
}

/** 응답에서 특정 브랜드의 언급 여부/위치. */
export interface Mention {
  brandId: string;
  mentioned: boolean;
  /** 응답 내 등장 순위(1=가장 먼저). 미언급이면 null. */
  rank: number | null;
  /** 인용 출처 URL(있을 때만). */
  sourceUrl?: string;
}

/** 한 엔진에 대한 분석 결과 (프롬프트 1회 실행 → 언급 탐지까지). */
export interface EngineAnalysis {
  engine: EngineId;
  model: string;
  mentions: Mention[];
  citations: string[];
  /** 엔진 호출이 실패했으면 사유(그래도 전체 분석은 계속 진행). */
  error?: string;
}

/** 프롬프트 하나를 여러 엔진에 돌린 통합 분석 결과. */
export interface AnalysisResult {
  prompt: string;
  runAt: string; // ISO8601
  perEngine: EngineAnalysis[];
  /** 브랜드별 언급 엔진 수. */
  mentionCounts: Record<string, number>;
  /** 브랜드별 Share of Voice (0..1). */
  shareOfVoice: Record<string, number>;
  /** SoV 최상위 브랜드(동률이면 먼저 등록된 것). 아무도 언급 안 되면 null. */
  topBrandId: string | null;
  /** 자사 브랜드 요약. */
  self: {
    brandId: string;
    mentionedInEngines: number;
    shareOfVoice: number;
    /** 엔진 통틀어 가장 높은(작은) 순위. 미언급이면 null. */
    bestRank: number | null;
  };
}

/** 시계열 그래프용 한 시점의 SoV 스냅샷. */
export interface HistoryPoint {
  runAt: string; // ISO8601
  /** 브랜드별 Share of Voice (0..1). */
  shareOfVoice: Record<string, number>;
}

/** 전환형 인용 분류 라벨 (PRD E5 차별화 기능). */
export type CitationClass = "conversion" | "neutral" | "negative";

/** 분류가 얹힌 언급. */
export interface ClassifiedMention extends Mention {
  citationClass: CitationClass;
  /** 분류 신뢰도 0..1. */
  confidence: number;
  /** 분류 근거가 된 응답 내 문장. */
  evidence: string;
}
