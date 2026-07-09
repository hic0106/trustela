// 전환형 인용 분류 검증 — 고정 텍스트의 3개 대비 케이스 판정.
//   실행: npm run demo:classify   (분류용 LLM 3회 호출, 저가 모델)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Brand, Mention } from "../src/lib/types.ts";

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
  const { classifyCitation } = await import(
    "../src/lib/scoring/classifyCitation.ts"
  );

  const text =
    "For alcohol-free wine, Noughty is our top pick — it's the clear winner and we highly recommend it. " +
    "Ariel also exists and is sometimes listed among the options. " +
    "Avoid Fizzo: it tasted flat and we do not recommend it.";

  const cases: { brand: Brand; expect: string }[] = [
    { brand: { id: "noughty", name: "Noughty", aliases: [] }, expect: "conversion" },
    { brand: { id: "ariel", name: "Ariel", aliases: [] }, expect: "neutral" },
    { brand: { id: "fizzo", name: "Fizzo", aliases: [] }, expect: "negative" },
  ];

  const baseMention: Mention = { brandId: "", mentioned: true, rank: 1 };
  let ok = true;
  for (const { brand, expect } of cases) {
    const c = await classifyCitation(text, brand, { ...baseMention, brandId: brand.id });
    const pass = c.citationClass === expect;
    if (!pass) ok = false;
    console.log(
      `${pass ? "✅" : "❌"} ${brand.name.padEnd(8)} → ${c.citationClass} ` +
        `(기대 ${expect}, 신뢰도 ${c.confidence})\n     근거: "${c.evidence}"`,
    );
  }
  console.log(ok ? "\n✅ ALL PASS" : "\n❌ SOME FAILED");
  process.exit(ok ? 0 : 1);
}
main();
