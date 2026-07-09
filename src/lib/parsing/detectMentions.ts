// 응답 파싱 — 브랜드 언급/순위 탐지 (스텁, PRD E3).

import type { Brand, Mention } from "../types";

/**
 * 엔진 원본 응답에서 각 브랜드의 언급 여부·순위를 추출한다.
 *
 * TODO(Phase 1): 별칭·대소문자·부분매칭 처리, 등장 위치로 rank 산출,
 * 인용 출처 URL 캡처. 초기엔 단순 문자열 매칭으로 시작해도 됨.
 */
export function detectMentions(
  _rawResponse: string,
  _brands: Brand[],
): Mention[] {
  throw new Error("[Trustela] detectMentions 미구현 (PRD E3).");
}
