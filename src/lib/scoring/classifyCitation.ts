// ⭐ 전환형 인용 구분 — Trustela 핵심 차별화 (스텁, PRD E5).

import type { ClassifiedMention, Mention } from "../types";

/**
 * 언급을 "추천 리스트 상위 포함(conversion) / 단순 나열(neutral) / 부정 맥락(negative)"
 * 으로 LLM 분류한다. 근거 문장과 신뢰도를 함께 반환한다.
 *
 * 이것이 경쟁사 대비 wedge — "인용은 늘었는데 전환형 인용은 그대로"를 직접 측정한다.
 * TODO(Phase 1): 분류용 LLM 프롬프트 설계, 근거 스니펫 추출, 사용자 라벨 수정 반영.
 */
export function classifyCitation(
  _rawResponse: string,
  _mention: Mention,
): Promise<ClassifiedMention> {
  throw new Error("[Trustela] classifyCitation 미구현 (PRD E5 차별화 기능).");
}
