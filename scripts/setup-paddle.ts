// Paddle 에 Trustela Product/Price 3종(월 구독, 14일 체험)을 생성하는 1회성 스크립트.
//   실행: npm run setup:paddle   (.env.local 의 PADDLE_API_KEY·PADDLE_ENV 사용)
// 이미 같은 이름의 product 가 있으면 재사용하고 price 만 새로 만든다.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
  // .env.local 없으면 셸 env 만 사용.
}

const { Paddle, Environment } = await import("@paddle/paddle-node-sdk");

const apiKey = process.env.PADDLE_API_KEY;
if (!apiKey) {
  console.error("PADDLE_API_KEY 가 없습니다. .env.local 에 sandbox API 키를 넣으세요.");
  process.exit(1);
}
const env = process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox;
const paddle = new Paddle(apiKey, { environment: env });

const PLANS = [
  { key: "STARTER", name: "Trustela Starter", amount: "3900", description: "10 prompts, ChatGPT + Perplexity, weekly auto-runs" },
  { key: "GROWTH",  name: "Trustela Growth",  amount: "9900", description: "50 prompts, all engines + Gemini, conversion citation analysis" },
  { key: "PRO",     name: "Trustela Pro",     amount: "19900", description: "200 prompts, daily auto-runs, API access" },
] as const;

console.log(`Paddle 환경: ${env === Environment.production ? "production" : "sandbox"}\n`);

const existing = await paddle.products.list({ status: ["active"] }).next();

const lines: string[] = [];
for (const plan of PLANS) {
  let product = existing.find((p) => p.name === plan.name);
  if (product) {
    console.log(`재사용 product: ${plan.name} (${product.id})`);
  } else {
    product = await paddle.products.create({
      name: plan.name,
      description: plan.description,
      taxCategory: "saas",
    });
    console.log(`생성 product: ${plan.name} (${product.id})`);
  }

  const price = await paddle.prices.create({
    productId: product.id,
    description: `${plan.name} monthly`,
    unitPrice: { amount: plan.amount, currencyCode: "USD" },
    billingCycle: { interval: "month", frequency: 1 },
    trialPeriod: { interval: "day", frequency: 14 },
    quantity: { minimum: 1, maximum: 1 },
  });
  console.log(`  price: $${Number(plan.amount) / 100}/mo, 14일 체험 (${price.id})`);
  lines.push(`PADDLE_PRICE_${plan.key}=${price.id}`);
}

// --- webhook destination (구독 이벤트 → 앱) --------------------------------
const WEBHOOK_URL =
  process.env.PADDLE_WEBHOOK_URL || "https://trustela.vercel.app/api/webhooks/paddle";
const SUBSCRIBED = [
  "subscription.created",
  "subscription.activated",
  "subscription.trialing",
  "subscription.updated",
  "subscription.paused",
  "subscription.resumed",
  "subscription.past_due",
  "subscription.canceled",
] as const;

const settings = await paddle.notificationSettings.list();
let hook = settings.find((s) => s.destination === WEBHOOK_URL);
if (hook) {
  console.log(`\n재사용 webhook: ${WEBHOOK_URL} (${hook.id})`);
} else {
  hook = await paddle.notificationSettings.create({
    description: "Trustela subscription sync",
    destination: WEBHOOK_URL,
    type: "url",
    subscribedEvents: [...SUBSCRIBED],
  });
  console.log(`\n생성 webhook: ${WEBHOOK_URL} (${hook.id})`);
}
lines.push(`PADDLE_WEBHOOK_SECRET=${hook.endpointSecretKey}`);

console.log("\n--- .env.local 에 넣을 값 ---");
for (const l of lines) console.log(l);
