// 응답 파싱 — 브랜드 언급/순위 탐지 (PRD E3).
// 답변 텍스트에서 각 브랜드(자사·경쟁사)의 언급 여부·등장 순위를 뽑고,
// 가능하면 인용 URL과 매칭해 sourceUrl 을 채운다.

import type { Brand, Mention } from "../types";

/** 소문자 haystack 에서 term 이 (영숫자 경계로) 처음 나오는 인덱스. 없으면 -1. */
function firstIndexOfTerm(haystackLower: string, term: string): number {
  const t = term.toLowerCase().trim();
  if (!t) return -1;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 앞뒤가 영숫자가 아니어야 매칭 (예: "Fre" 가 "free" 에 잘못 걸리지 않도록).
  const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`);
  const m = re.exec(haystackLower);
  return m ? m.index : -1;
}

/** 브랜드명/별칭을 영숫자만 남긴 슬러그 목록으로. */
function brandSlugs(brand: Brand): string[] {
  return [brand.name, ...brand.aliases]
    .map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((s) => s.length >= 3);
}

/** 인용 URL 중 브랜드 슬러그가 호스트명에 들어가는 첫 URL. */
function matchCitation(brand: Brand, citations: string[]): string | undefined {
  const slugs = brandSlugs(brand);
  if (slugs.length === 0) return undefined;
  for (const url of citations) {
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]/g, "");
    } catch {
      continue;
    }
    if (slugs.some((s) => host.includes(s))) return url;
  }
  return undefined;
}

/**
 * 답변 텍스트에서 각 브랜드의 언급 여부·순위를 추출한다.
 * rank 는 언급된 브랜드끼리 첫 등장 위치 순(1=가장 먼저). 미언급이면 null.
 */
export function detectMentions(
  text: string,
  brands: Brand[],
  citations: string[] = [],
): Mention[] {
  const lower = text.toLowerCase();

  // 브랜드별 첫 등장 인덱스 (미언급이면 Infinity).
  const firstIndex = new Map<string, number>();
  for (const brand of brands) {
    let min = Infinity;
    for (const term of [brand.name, ...brand.aliases]) {
      const idx = firstIndexOfTerm(lower, term);
      if (idx !== -1 && idx < min) min = idx;
    }
    firstIndex.set(brand.id, min);
  }

  // 언급된 브랜드를 등장 순으로 정렬해 rank 부여.
  const rank = new Map<string, number>();
  brands
    .filter((b) => firstIndex.get(b.id) !== Infinity)
    .sort((a, b) => firstIndex.get(a.id)! - firstIndex.get(b.id)!)
    .forEach((b, i) => rank.set(b.id, i + 1));

  return brands.map((brand) => {
    const mentioned = firstIndex.get(brand.id) !== Infinity;
    return {
      brandId: brand.id,
      mentioned,
      rank: mentioned ? rank.get(brand.id)! : null,
      sourceUrl: mentioned ? matchCitation(brand, citations) : undefined,
    };
  });
}
