// LLM 엔진 커넥터 계약 + 레지스트리 (스텁).
// 실제 구현은 API 키가 필요하다 — 키는 사용자 본인이 .env.local 에 채운다.

import type { EngineId } from "../types";

export interface EngineConnector {
  id: EngineId;
  /** 프롬프트를 엔진에 실행하고 원본 응답 텍스트를 반환. */
  run(prompt: string): Promise<string>;
}

/**
 * TODO(Phase 1): OpenAI(ChatGPT)·Perplexity 커넥터 구현.
 * 키 미설정 시 이 함수는 명시적으로 실패한다 — "동작하는 척" 금지.
 */
export function getConnector(engine: EngineId): EngineConnector {
  throw new Error(
    `[Trustela] EngineConnector '${engine}' 미구현. ` +
      `.env.local 에 해당 엔진 API 키를 넣고 커넥터를 구현하세요.`,
  );
}
