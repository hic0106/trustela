// detectMentions 결정적 검증 (실 API 호출 없음).
//   실행: npm run test:parser
import type { Brand } from "../src/lib/types.ts";

async function main() {
  const { detectMentions } = await import("../src/lib/parsing/detectMentions.ts");

  // 실제 엔진 답변을 흉내낸 고정 샘플 (브랜드 등장 순서: Noughty > Töst > Giesen > Ariel).
  // 'Fre' 브랜드는 등장하지 않지만 "alcohol-free"/"sugar-free" 의 'free' 가 있어 오탐 여부를 시험.
  const text =
    "The best alcohol-free wine brands are Noughty by Thomson & Scott, " +
    "followed by Töst and Giesen. Ariel is also decent. " +
    "All of these are alcohol-free and sugar-free options.";
  const citations = [
    "https://thezeroproof.com/collections/best",
    "https://www.noughtyaf.com/products/rouge",
  ];

  const brands: Brand[] = [
    { id: "noughty", name: "Noughty", aliases: [] },
    { id: "tost", name: "Töst", aliases: ["Tost"] },
    { id: "giesen", name: "Giesen", aliases: [] },
    { id: "ariel", name: "Ariel", aliases: [] },
    { id: "fre", name: "Fre", aliases: [] }, // 'free' 에 오탐되면 안 됨
  ];

  const result = detectMentions(text, brands, citations);
  const by = Object.fromEntries(result.map((m) => [m.brandId, m]));
  console.log(JSON.stringify(result, null, 2));

  const checks: [string, boolean][] = [
    ["Noughty rank 1", by.noughty.rank === 1],
    ["Töst rank 2 (별칭 아닌 본명 매칭)", by.tost.rank === 2],
    ["Giesen rank 3", by.giesen.rank === 3],
    ["Ariel rank 4", by.ariel.rank === 4],
    ["Fre 미언급('free'에 오탐 안 함)", by.fre.mentioned === false && by.fre.rank === null],
    ["Noughty sourceUrl = noughtyaf.com 매칭", by.noughty.sourceUrl?.includes("noughtyaf") === true],
    ["Giesen sourceUrl 없음(매칭 인용 없음)", by.giesen.sourceUrl === undefined],
  ];

  let ok = true;
  console.log("\n--- checks ---");
  for (const [name, pass] of checks) {
    console.log(`${pass ? "✅" : "❌"} ${name}`);
    if (!pass) ok = false;
  }
  console.log(ok ? "\n✅ ALL PASS" : "\n❌ SOME FAILED");
  process.exit(ok ? 0 : 1);
}

main();
