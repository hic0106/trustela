// ⭐ 전환형 인용 구분 — Trustela 핵심 차별화 (PRD E5).
// 언급을 "추천 상위(conversion) / 단순 나열(neutral) / 부정(negative)" 으로 LLM 분류하고,
// 근거 문장과 신뢰도를 함께 반환한다. "인용은 늘었는데 전환형 인용은 그대로"를 직접 측정한다.

import type { Brand, CitationClass, ClassifiedMention, Mention } from "../types";

const VALID: CitationClass[] = ["conversion", "neutral", "negative"];

const SYSTEM_PROMPT = [
  "You judge how a specific brand is presented in an AI assistant's answer to a shopping question.",
  "Classify into exactly one:",
  '- "conversion": presented as a top pick, best choice, or an explicit recommendation likely to drive a purchase.',
  '- "neutral": merely listed or mentioned in passing, without clear endorsement.',
  '- "negative": mentioned unfavorably, or as something to avoid.',
  'Respond ONLY with JSON: {"class": "...", "confidence": 0.0-1.0, "evidence": "the single sentence that best supports the class"}.',
].join("\n");

function clamp01(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * 답변 텍스트에서 brand 가 어떻게 제시됐는지 분류한다.
 * mention.mentioned 가 false 여도 호출은 가능하나, 보통 언급된 브랜드에만 쓴다.
 */
export async function classifyCitation(
  text: string,
  brand: Brand,
  mention: Mention,
): Promise<ClassifiedMention> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("[Trustela] classifyCitation: OPENAI_API_KEY 가 필요합니다.");
  }
  const model = process.env.CLASSIFIER_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Brand: ${brand.name}\n\nAnswer:\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(
      `[Trustela] classifyCitation 응답 오류 ${res.status}: ${await res.text()}`,
    );
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: { class?: string; confidence?: unknown; evidence?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[Trustela] classifyCitation JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  const citationClass: CitationClass = VALID.includes(parsed.class as CitationClass)
    ? (parsed.class as CitationClass)
    : "neutral";

  return {
    ...mention,
    citationClass,
    confidence: clamp01(parsed.confidence),
    evidence: typeof parsed.evidence === "string" ? parsed.evidence : "",
  };
}
