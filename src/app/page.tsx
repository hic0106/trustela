"use client";

import { useState } from "react";
import type { AnalysisResult, EngineId, Mention } from "@/lib/types";

type Classifiedish = Mention & { citationClass?: string; confidence?: number };

const ENGINES: { id: EngineId; label: string }[] = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "perplexity", label: "Perplexity" },
];

function slug(s: string, fallback: string): string {
  const out = s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || fallback;
}

const classColor: Record<string, string> = {
  conversion: "bg-green-500/15 text-green-600 dark:text-green-400",
  neutral: "bg-gray-500/15 text-gray-500 dark:text-gray-400",
  negative: "bg-red-500/15 text-red-600 dark:text-red-400",
};

export default function Home() {
  const [prompt, setPrompt] = useState("What are the best alcohol-free wine brands?");
  const [selfName, setSelfName] = useState("Acme Wines");
  const [competitors, setCompetitors] = useState("Noughty, Giesen, Zeronimo, Ariel");
  const [engines, setEngines] = useState<Record<EngineId, boolean>>({
    chatgpt: true,
    perplexity: true,
    gemini: false,
  });
  const [classify, setClassify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // brandId → name 매핑 (result 엔 name 이 없으니 입력에서 재구성).
  function buildBrandNames(): Map<string, string> {
    const m = new Map<string, string>();
    m.set(slug(selfName, "self"), selfName.trim());
    competitors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((name, i) => m.set(slug(name, `brand-${i}`), name));
    return m;
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    const selfId = slug(selfName, "self");
    const brands = [
      { id: selfId, name: selfName.trim(), aliases: [] as string[] },
      ...competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((name, i) => ({ id: slug(name, `brand-${i}`), name, aliases: [] as string[] })),
    ];
    const selectedEngines = ENGINES.filter((e) => engines[e.id]).map((e) => e.id);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, brands, selfBrandId: selfId, engines: selectedEngines, classify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `요청 실패 (${res.status})`);
      setResult(data as AnalysisResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const brandNames = result ? buildBrandNames() : new Map<string, string>();
  const sortedBrands = result
    ? Object.keys(result.shareOfVoice).sort(
        (a, b) => result.shareOfVoice[b] - result.shareOfVoice[a],
      )
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Trustela</h1>
        <p className="mt-1 text-sm opacity-70">
          AI 검색이 당신 브랜드를 추천하는지 측정하세요 — SoV·순위·전환형 인용.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-black/10 dark:border-white/15 p-5">
        <label className="block">
          <span className="text-sm font-medium">프롬프트 (쇼핑객이 AI에 묻는 질문)</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:focus:border-white/50"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">자사 브랜드</span>
            <input
              value={selfName}
              onChange={(e) => setSelfName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:focus:border-white/50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">경쟁사 (쉼표로 구분)</span>
            <input
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:focus:border-white/50"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium">엔진:</span>
          {ENGINES.map((e) => (
            <label key={e.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={engines[e.id]}
                onChange={(ev) => setEngines((s) => ({ ...s, [e.id]: ev.target.checked }))}
              />
              {e.label}
            </label>
          ))}
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={classify} onChange={(e) => setClassify(e.target.checked)} />
            전환형 인용 분류
          </label>
        </div>

        <button
          onClick={analyze}
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {loading ? "분석 중… (수십 초)" : "분석하기"}
        </button>
      </section>

      {error && (
        <p className="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </p>
      )}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2 text-xs">
            {result.perEngine.map((e) => (
              <span
                key={e.engine}
                className={`rounded-full px-2.5 py-1 ${
                  e.error ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {e.error ? `⚠️ ${e.engine}` : `✓ ${e.engine} · ${e.model} · 인용 ${e.citations.length}`}
              </span>
            ))}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold opacity-70">Share of Voice</h2>
            <div className="space-y-1.5">
              {sortedBrands.map((id) => {
                const sov = result.shareOfVoice[id];
                const isSelf = id === result.self.brandId;
                return (
                  <div key={id} className="flex items-center gap-3 text-sm">
                    <span className={`w-40 shrink-0 truncate ${isSelf ? "font-semibold" : ""}`}>
                      {brandNames.get(id) ?? id}
                      {isSelf && <span className="ml-1 text-xs opacity-60">◀ 자사</span>}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full bg-foreground"
                        style={{ width: `${Math.round(sov * 100)}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      {Math.round(sov * 100)}% · {result.mentionCounts[id]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {classify && (
            <div>
              <h2 className="mb-2 text-sm font-semibold opacity-70">전환형 인용 분류</h2>
              <div className="space-y-3">
                {result.perEngine
                  .filter((e) => !e.error)
                  .map((e) => {
                    const classified = e.mentions.filter(
                      (m) => m.mentioned && "citationClass" in m,
                    ) as Classifiedish[];
                    if (classified.length === 0) return null;
                    return (
                      <div key={e.engine}>
                        <p className="mb-1 text-xs font-medium opacity-60">{e.engine}</p>
                        <div className="flex flex-wrap gap-2">
                          {classified.map((m) => (
                            <span
                              key={m.brandId}
                              className={`rounded-full px-2.5 py-1 text-xs ${
                                classColor[m.citationClass ?? "neutral"] ?? classColor.neutral
                              }`}
                              title={m.confidence ? `신뢰도 ${m.confidence}` : undefined}
                            >
                              {brandNames.get(m.brandId) ?? m.brandId}: {m.citationClass}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-black/5 dark:bg-white/5 p-4 text-sm">
            <p>
              🏆 1위 브랜드:{" "}
              <b>{result.topBrandId ? brandNames.get(result.topBrandId) ?? result.topBrandId : "없음"}</b>
            </p>
            <p className="mt-1">
              📉 자사 <b>{brandNames.get(result.self.brandId) ?? result.self.brandId}</b>: SoV{" "}
              <b>{Math.round(result.self.shareOfVoice * 100)}%</b> · {result.self.mentionedInEngines}/
              {result.perEngine.length} 엔진 언급 · 최고순위 {result.self.bestRank ?? "미노출"}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
