// Share of Voice 계산 — 순수 함수 (외부 의존성 없음, 테스트 가능).

/**
 * 브랜드별 언급 횟수 맵을 받아 각 브랜드의 Share of Voice(0..1)를 반환한다.
 * SoV = 해당 브랜드 언급 수 / 전체 브랜드 언급 수 합.
 * 전체 합이 0이면 모든 브랜드 0을 반환한다.
 */
export function shareOfVoice(
  mentionCounts: Record<string, number>,
): Record<string, number> {
  const total = Object.values(mentionCounts).reduce(
    (sum, n) => sum + Math.max(0, n),
    0,
  );
  const result: Record<string, number> = {};
  for (const [brandId, count] of Object.entries(mentionCounts)) {
    result[brandId] = total === 0 ? 0 : Math.max(0, count) / total;
  }
  return result;
}
