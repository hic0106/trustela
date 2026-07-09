// LLM 엔진 커넥터 — 프롬프트를 각 엔진에 실행하고 답변+인용을 반환한다.
//
// Phase 1 대상: ChatGPT(OpenAI Responses API + web_search) / Perplexity(Sonar).
// 두 엔진 모두 "웹 검색이 켜진" 경로로 호출해야 실제 사용자가 보는 추천을 재현한다.
// API 키는 사용자가 .env.local 에 넣는다 — 키가 없으면 명시적으로 실패한다.

import type { EngineId, EngineResult } from "../types";

export interface EngineConnector {
  id: EngineId;
  run(prompt: string): Promise<EngineResult>;
}

/** 답변당 최대 출력 토큰 — 비용 통제 vs 브랜드 리스트 잘림 방지 절충. */
const MAX_OUTPUT_TOKENS = 1000;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `[Trustela] 환경변수 ${name} 가 비어 있습니다. .env.local 에 키를 넣으세요.`,
    );
  }
  return v.trim();
}

/** 배열에서 URL 문자열만 중복 제거해 뽑는다. */
function dedupeUrls(urls: (string | undefined | null)[]): string[] {
  return [...new Set(urls.filter((u): u is string => !!u && /^https?:\/\//.test(u)))];
}

// --- OpenAI (ChatGPT) : Responses API + web_search 툴 ---------------------

const openaiConnector: EngineConnector = {
  id: "chatgpt",
  async run(prompt: string): Promise<EngineResult> {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o";

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        tools: [{ type: "web_search" }],
        // 웹 검색을 강제해야 학습지식이 아닌 웹 기반 추천(=실사용자가 보는 답)을 잰다.
        tool_choice: "required",
        max_output_tokens: MAX_OUTPUT_TOKENS,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `[Trustela] OpenAI 응답 오류 ${res.status}: ${await res.text()}`,
      );
    }

    const data = await res.json();
    // Responses API: output[] 안의 message 아이템에서 텍스트와 url_citation 주석을 모은다.
    let text = "";
    const citations: string[] = [];
    for (const item of data.output ?? []) {
      if (item.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part.type === "output_text") {
          text += part.text ?? "";
          for (const ann of part.annotations ?? []) {
            if (ann.type === "url_citation" && ann.url) citations.push(ann.url);
          }
        }
      }
    }
    // 일부 응답은 편의 필드 output_text 를 제공한다.
    if (!text && typeof data.output_text === "string") text = data.output_text;

    return { engine: "chatgpt", model, text, citations: dedupeUrls(citations) };
  },
};

// --- Perplexity : Sonar chat completions (OpenAI 호환) --------------------

const perplexityConnector: EngineConnector = {
  id: "perplexity",
  async run(prompt: string): Promise<EngineResult> {
    const apiKey = requireEnv("PERPLEXITY_API_KEY");
    const model = process.env.PERPLEXITY_MODEL?.trim() || "sonar";

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `[Trustela] Perplexity 응답 오류 ${res.status}: ${await res.text()}`,
      );
    }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    // Sonar 는 citations(문자열 URL 배열) + search_results(객체) 를 준다.
    const fromCitations: string[] = Array.isArray(data.citations)
      ? data.citations
      : [];
    const fromResults: string[] = Array.isArray(data.search_results)
      ? data.search_results.map((r: { url?: string }) => r.url ?? "")
      : [];

    return {
      engine: "perplexity",
      model,
      text,
      citations: dedupeUrls([...fromCitations, ...fromResults]),
    };
  },
};

const CONNECTORS: Partial<Record<EngineId, EngineConnector>> = {
  chatgpt: openaiConnector,
  perplexity: perplexityConnector,
};

/** 엔진 커넥터를 반환한다. 미지원 엔진(예: gemini)은 명시적으로 실패. */
export function getConnector(engine: EngineId): EngineConnector {
  const connector = CONNECTORS[engine];
  if (!connector) {
    throw new Error(
      `[Trustela] EngineConnector '${engine}' 미지원 (Phase 1: chatgpt, perplexity).`,
    );
  }
  return connector;
}
