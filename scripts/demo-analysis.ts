// 파이프라인 통합 데모 — 실프롬프트를 두 엔진에 돌려 SoV·순위 리포트 출력.
//   실행: npm run demo:analysis
// ⚠️ 실제 API 호출로 소량 비용 발생.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Brand } from "../src/lib/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const raw of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const k = line.slice(0, eq).trim();
  const v = line.slice(eq + 1).trim();
  if (k && v && !process.env[k]) process.env[k] = v;
}

async function main() {
  const { runPromptAnalysis } = await import(
    "../src/lib/pipeline/runPromptAnalysis.ts"
  );

  // 자사(Acme, 가상) + 경쟁사. 실제 브랜드 운영자라면 여기에 자기/경쟁 브랜드를 넣는다.
  const brands: Brand[] = [
    { id: "acme", name: "Acme Wines", aliases: ["Acme"] }, // 자사(가상)
    { id: "noughty", name: "Noughty", aliases: [] },
    { id: "tost", name: "Töst", aliases: ["Tost"] },
    { id: "giesen", name: "Giesen", aliases: [] },
    { id: "zeronimo", name: "Zeronimo", aliases: [] },
    { id: "ariel", name: "Ariel", aliases: [] },
  ];

  // CLASSIFY=1 로 실행하면 전환형 인용 분류까지 켠다(추가 LLM 비용).
  const classify = process.env.CLASSIFY === "1";
  const result = await runPromptAnalysis({
    prompt: "What are the best alcohol-free wine brands?",
    brands,
    selfBrandId: "acme",
    engines: ["chatgpt", "perplexity"],
    classify,
  });

  console.log(`\n📊 프롬프트: "${result.prompt}"`);
  console.log(`실행: ${result.runAt}\n`);

  for (const ea of result.perEngine) {
    if (ea.error) console.log(`  ⚠️ ${ea.engine}: ${ea.error}`);
    else console.log(`  ✓ ${ea.engine} (${ea.model}), 인용 ${ea.citations.length}개`);
  }

  console.log("\n브랜드            SoV     언급엔진");
  console.log("─".repeat(40));
  const name = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const sorted = [...brands].sort(
    (a, b) => result.shareOfVoice[b.id] - result.shareOfVoice[a.id],
  );
  for (const b of sorted) {
    const sov = (result.shareOfVoice[b.id] * 100).toFixed(0) + "%";
    const cnt = result.mentionCounts[b.id];
    const isSelf = b.id === result.self.brandId ? " ◀ 자사" : "";
    console.log(
      `${name[b.id].padEnd(16)} ${sov.padStart(5)}   ${String(cnt).padStart(4)}${isSelf}`,
    );
  }

  if (classify) {
    console.log("\n── 전환형 인용 분류 ──");
    for (const ea of result.perEngine) {
      const classified = ea.mentions.filter(
        (m) => m.mentioned && "citationClass" in m,
      );
      if (classified.length === 0) continue;
      console.log(`  [${ea.engine}]`);
      for (const m of classified) {
        const c = m as typeof m & { citationClass: string; confidence: number };
        console.log(`    ${name[m.brandId].padEnd(12)} ${c.citationClass} (${c.confidence})`);
      }
    }
  }

  console.log("\n── 요약 ──");
  console.log(`🏆 1위 브랜드: ${result.topBrandId ? name[result.topBrandId] : "없음"}`);
  console.log(
    `📉 자사(${name[result.self.brandId]}): SoV ${(result.self.shareOfVoice * 100).toFixed(0)}%, ` +
      `${result.self.mentionedInEngines}/${result.perEngine.length} 엔진 언급, ` +
      `최고순위 ${result.self.bestRank ?? "미노출"}`,
  );
}
main();
