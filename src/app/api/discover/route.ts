// POST /api/discover { url?, brand?, product? } — 셋 중 하나만 있어도 경쟁사·프롬프트를 발굴.
// 웹 검색이 켜진 gpt-4o-mini 로 실제 시장의 경쟁 브랜드를 찾는다(학습지식 한정 방지).
// URL 만 주면 사이트에서 브랜드명·카테고리를 추론해 brand 필드로 돌려준다.
// 로그인 필수(호출당 비용 발생 — 익명 남용 차단).
import { getUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_OUTPUT_TOKENS = 700;

interface DiscoverResult {
  brand: string | null;
  competitors: string[];
  prompts: string[];
}

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** 입력 문자로 출력 언어를 결정론적으로 판정 — 모델의 언어 감지는 불안정하다. */
function detectLanguage(text: string): string | null {
  if (/[가-힣ㄱ-ㆎ]/.test(text)) return "Korean";
  if (/[぀-ヿ]/.test(text)) return "Japanese";
  if (/[一-鿿]/.test(text)) return "Chinese";
  if (/[a-zA-Z]/.test(text)) return "English";
  return null;
}

/** 모델 응답에서 JSON 객체를 최대한 관대하게 파싱(코드펜스·앞뒤 잡담 허용). */
function parseDiscovery(text: string): DiscoverResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as {
      brand?: unknown;
      competitors?: unknown;
      prompts?: unknown;
    };
    const clean = (arr: unknown): string[] =>
      Array.isArray(arr)
        ? arr.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim())
        : [];
    const competitors = clean(obj.competitors).slice(0, 8);
    const prompts = clean(obj.prompts).slice(0, 6);
    const brand =
      typeof obj.brand === "string" && obj.brand.trim() ? obj.brand.trim() : null;
    if (competitors.length === 0 && prompts.length === 0) return null;
    return { brand, competitors, prompts };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return bad("login_required", 401);

  let body: { url?: unknown; brand?: unknown; product?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("JSON 본문을 파싱할 수 없습니다.");
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  const brand = typeof body.brand === "string" ? body.brand.trim() : "";
  const product = typeof body.product === "string" ? body.product.trim() : "";
  if (!rawUrl && !brand && !product) {
    return bad("url, brand, product 중 하나는 필요합니다.");
  }
  if (rawUrl.length > 200 || brand.length > 100 || product.length > 200) {
    return bad("입력이 너무 깁니다.");
  }

  // URL 정규화(스킴 없으면 https:// 보정) + 형식 검증.
  let url = "";
  if (rawUrl) {
    const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    try {
      url = new URL(candidate).href;
    } catch {
      return bad("웹사이트 주소 형식이 올바르지 않습니다.");
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return bad("OPENAI_API_KEY 가 설정되지 않았습니다(서버 env).", 500);

  // 언어: 텍스트 입력에서 판정. URL 만 있으면 사이트의 주 언어를 따르게 한다.
  const language = detectLanguage(`${brand} ${product}`);
  const languageRule = language
    ? `- LANGUAGE: write every prompt strictly in ${language}. NEVER follow the language of web search results.`
    : `- LANGUAGE: write every prompt in the primary language of the brand's website content. If unclear, use English. NEVER follow the language of unrelated web search results.`;

  const known = [
    url ? `Website: ${url}` : null,
    brand ? `Brand: "${brand}"` : null,
    product ? `Product/category: "${product}"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const instruction = [
    `You are a market research assistant for an ecommerce brand. Here is what we know about the brand:`,
    known,
    ``,
    `Using web search${url ? " (start by looking up the website above to identify the brand name and its product category)" : ""}, find this brand's real competitors in its product category, then write the questions shoppers actually ask AI assistants when deciding what to buy in this category.`,
    ``,
    `Respond with ONLY a JSON object, no prose, in this exact shape:`,
    `{"brand": "the brand's name", "competitors": ["Brand A", "Brand B", ...], "prompts": ["question 1", "question 2", ...]}`,
    ``,
    `Rules:`,
    `- "brand": the brand's own name. ${brand ? `We already know it is "${brand}" — echo it.` : `Infer it from the website or product context; null only if there is no identifiable brand.`}`,
    `- 5-8 competitors: direct competitor brand names only (no marketplaces, no retailers, and never the brand itself).`,
    `- Competitor names must use each brand's official international (Latin-alphabet) name — e.g. "Samsung", "Xiaomi" — never localized transliterations like "三星".`,
    `- 4-6 prompts: natural shopper questions where AI would recommend brands (e.g. "What are the best ... brands?"). Do NOT mention any brand name inside the prompts.`,
    languageRule,
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: instruction,
      tools: [{ type: "web_search" }],
      max_output_tokens: MAX_OUTPUT_TOKENS,
    }),
  });

  if (!res.ok) {
    return bad(`경쟁사 발굴 실패(OpenAI ${res.status}). 잠시 후 다시 시도하세요.`, 502);
  }

  const data = await res.json();
  let text = "";
  for (const item of data.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text") text += part.text ?? "";
    }
  }
  if (!text && typeof data.output_text === "string") text = data.output_text;

  const parsed = parseDiscovery(text);
  if (!parsed) {
    return bad("발굴 결과를 해석하지 못했습니다. 입력을 조금 더 구체적으로 써보세요.", 502);
  }

  // 사용자가 브랜드를 직접 입력했다면 그 표기를 우선한다.
  if (brand) parsed.brand = brand;

  return Response.json(parsed);
}
