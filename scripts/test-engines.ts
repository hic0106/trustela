// 엔진 커넥터 실호출 검증 스크립트.
//   실행: npm run test:engines   (tsx 로 .env.local 로드 후 각 엔진 1회 호출)
// ⚠️ 실제 API를 호출하므로 소량의 사용량 비용이 발생한다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { EngineId } from "../src/lib/types.ts";

// --- .env.local 을 process.env 로 로드 (의존성 없이) ---
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("[.env.local 을 읽지 못했습니다]");
}

const PROMPT = "What are the best alcohol-free wine brands?";
const ENGINES: EngineId[] = ["chatgpt", "perplexity"];

async function main() {
  const { getConnector } = await import("../src/lib/engines/connector.ts");
  for (const engine of ENGINES) {
    console.log(`\n===== ${engine} =====`);
    try {
      const t0 = Date.now();
      const result = await getConnector(engine).run(PROMPT);
      const ms = Date.now() - t0;
      console.log(`model: ${result.model}  (${ms}ms)`);
      console.log(`text (앞 300자):\n${result.text.slice(0, 300)}...`);
      console.log(`citations (${result.citations.length}):`);
      for (const url of result.citations.slice(0, 5)) console.log(`  - ${url}`);
    } catch (err) {
      console.error(`❌ ${engine} 실패:`, (err as Error).message);
    }
  }
}

main();
