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

/** 한 엔진에 프롬프트를 1회 실행한 원본 결과. */
export interface EngineRun {
  promptId: string;
  engine: EngineId;
  runAt: string; // ISO8601
  rawResponse: string;
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
