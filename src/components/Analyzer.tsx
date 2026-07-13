"use client";

// 분석 도구 본체 — 랜딩(무료 체험)과 대시보드(로그인 앱)가 공유한다.
// mode="landing": 익명 1회 체험 + 로그인 유도 게이트. 추적 목록 없음.
// mode="app": 추적 프롬프트 목록/등록/삭제 + 플랜 한도 안내(#plans 로 스크롤).
import { useEffect, useState } from "react";
import type { AnalysisResult, EngineId, Mention, HistoryPoint, TrackedPrompt } from "@/lib/types";
import { SovTimeline } from "@/components/SovTimeline";

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

export interface AnalyzerPrefill {
  prompt?: string;
  selfName?: string;
  competitors?: string;
}

export default function Analyzer({
  mode,
  prefill,
}: {
  mode: "landing" | "app";
  prefill?: AnalyzerPrefill;
}) {
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
  const [gated, setGated] = useState(false); // 익명 무료 1회 소진 → 로그인 유도
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [tracked, setTracked] = useState<TrackedPrompt[]>([]);
  const [trackBusy, setTrackBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  // 부모(대시보드의 브랜드 셋업)가 내려주는 값으로 폼을 채운다.
  // 렌더 중 상태 조정 패턴 — prop 변경에 맞춰 상태를 갱신할 때의 권장 방식.
  const [prevPrefill, setPrevPrefill] = useState(prefill);
  if (prefill !== prevPrefill) {
    setPrevPrefill(prefill);
    if (prefill?.prompt !== undefined) setPrompt(prefill.prompt);
    if (prefill?.selfName !== undefined) setSelfName(prefill.selfName);
    if (prefill?.competitors !== undefined) setCompetitors(prefill.competitors);
  }

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

  function buildBrands() {
    const selfId = slug(selfName, "self");
    return {
      selfId,
      brands: [
        { id: selfId, name: selfName.trim(), aliases: [] as string[] },
        ...competitors
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .map((name, i) => ({ id: slug(name, `brand-${i}`), name, aliases: [] as string[] })),
      ],
    };
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    setGated(false);
    setResult(null);
    setHistory([]);

    const { selfId, brands } = buildBrands();
    const selectedEngines = ENGINES.filter((e) => engines[e.id]).map((e) => e.id);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, brands, selfBrandId: selfId, engines: selectedEngines, classify }),
      });
      const data = await res.json();
      if (res.status === 401 && data.error === "login_required") {
        setGated(true);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(data as AnalysisResult);

      try {
        const hres = await fetch(`/api/history?prompt=${encodeURIComponent(prompt)}`);
        if (hres.ok) {
          const hdata = await hres.json();
          setHistory((hdata.points ?? []) as HistoryPoint[]);
        }
      } catch {
        // History is a nice-to-have — ignore failures.
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTracked() {
    try {
      const res = await fetch("/api/tracked");
      if (res.ok) {
        const data = await res.json();
        setTracked((data.tracked ?? []) as TrackedPrompt[]);
      }
    } catch {
      // Tracked list is non-critical.
    }
  }

  // 앱 모드에서만 추적 목록을 불러온다(랜딩은 익명이라 의미 없음).
  useEffect(() => {
    if (mode !== "app") return;
    let cancelled = false;
    fetch("/api/tracked")
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setTracked((data.tracked ?? []) as TrackedPrompt[]);
      })
      .catch(() => {
        // Tracked list is non-critical.
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function trackCurrent() {
    setTrackBusy(true);
    const { selfId, brands } = buildBrands();
    const selectedEngines = ENGINES.filter((e) => engines[e.id]).map((e) => e.id);
    try {
      const res = await fetch("/api/tracked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, selfBrandId: selfId, brands, engines: selectedEngines, classify, frequency: "weekly" }),
      });
      if (res.status === 401) {
        // 자동 실행 등록은 로그인 필요 → 로그인 페이지로.
        window.location.href = "/login";
        return;
      }
      if (res.status === 402 || res.status === 409) {
        // 유료 필요 / 한도 초과 → 안내 + 플랜 섹션으로.
        const data = await res.json().catch(() => ({}));
        setBillingMsg(data.message ?? "Upgrade your plan to add more auto-run prompts.");
        const target = mode === "app" ? "#plans" : "#pricing";
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      if (res.ok) await loadTracked();
    } catch {
      // ignore
    } finally {
      setTrackBusy(false);
    }
  }

  async function removeTracked(id: string) {
    try {
      const res = await fetch(`/api/tracked?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) setTracked((t) => t.filter((x) => x.id !== id));
    } catch {
      // ignore
    }
  }

  const brandNames = result ? buildBrandNames() : new Map<string, string>();
  const sortedBrands = result
    ? Object.keys(result.shareOfVoice).sort(
        (a, b) => result.shareOfVoice[b] - result.shareOfVoice[a],
      )
    : [];

  function toggleEngine(id: EngineId) {
    setEngines((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <>
      <div className="toolcard rv d1">
        <div className="field">
          <label className="field-label">Prompt <span className="hint">(what a shopper asks the AI)</span></label>
          <textarea className="textarea" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label className="field-label">Your brand</label>
            <input className="input" value={selfName} onChange={(e) => setSelfName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Competitors <span className="hint">(comma-separated)</span></label>
            <input className="input" value={competitors} onChange={(e) => setCompetitors(e.target.value)} />
          </div>
        </div>
        <div className="engines-pick">
          <span className="lab">Engines:</span>
          {ENGINES.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`chip ${engines[e.id] ? "on" : ""}`}
              onClick={() => toggleEngine(e.id)}
            >
              <span className="tick">✓</span>{e.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip ${classify ? "on" : ""}`}
            onClick={() => setClassify((c) => !c)}
          >
            <span className="tick">✓</span>Conversion citations
          </button>
        </div>
        <div className="tool-actions">
          <button className="btn btn-primary btn-lg" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing… (may take a while)" : "Analyze →"}
          </button>
          <button className="btn btn-ghost btn-lg" onClick={trackCurrent} disabled={trackBusy}>
            {trackBusy ? "Adding…" : "＋ Auto-run weekly"}
          </button>
        </div>
      </div>

      {mode === "app" && tracked.length > 0 && (
        <div className="tracked">
          <div className="tracked-head">
            <span className="barlab" style={{ margin: 0 }}>Auto-run schedule</span>
            <span className="tracked-note">Runs automatically on schedule · fills your trend chart</span>
          </div>
          <ul className="tracked-list">
            {tracked.map((t) => (
              <li key={t.id} className="tracked-item">
                <div className="tracked-main">
                  <span className="tracked-prompt">{t.prompt}</span>
                  <span className="tracked-meta">
                    {t.frequency} · {t.engines.join(" · ")}
                    {t.lastRunAt ? ` · last run ${new Date(t.lastRunAt).toLocaleDateString()}` : " · not run yet"}
                  </span>
                </div>
                <button className="tracked-remove" onClick={() => removeTracked(t.id)} aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {billingMsg && (
        <div className="billing-banner">
          <span>{billingMsg}</span>
          <button className="billing-x" onClick={() => setBillingMsg(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {gated && (
        <div className="gate-box">
          <div className="gate-title">That was your free analysis 🎉</div>
          <p className="gate-sub">
            Create a free account to keep analyzing, save your results, and track brands over time.
          </p>
          <a className="btn btn-primary btn-lg" href="/login">Log in / Sign up to continue →</a>
        </div>
      )}

      {error && <p className="error-box">⚠️ {error}</p>}

      {result && (
        <div className="result-block">
          <div className="engine-pills">
            {result.perEngine.map((e) => (
              <span key={e.engine} className={`epill ${e.error ? "err" : ""}`}>
                {e.error ? `⚠️ ${e.engine}` : `✓ ${e.engine} · ${e.model} · ${e.citations.length} citations`}
              </span>
            ))}
          </div>

          <div className="res-card">
            <div className="barlab">Share of Voice</div>
            {sortedBrands.map((id) => {
              const sov = result.shareOfVoice[id];
              const isSelf = id === result.self.brandId;
              return (
                <div key={id} className="bar-row">
                  <span className={`bar-name ${isSelf ? "self" : ""}`}>
                    {brandNames.get(id) ?? id}
                    {isSelf && <span className="self"> ◀ you</span>}
                  </span>
                  <span className="track"><i className={`fill ${sov === 0 ? "muted" : ""}`} style={{ width: `${Math.max(Math.round(sov * 100), 2)}%` }} /></span>
                  <span className="bar-val">{Math.round(sov * 100)}% · {result.mentionCounts[id]}</span>
                </div>
              );
            })}
          </div>

          {history.length > 0 && (
            <div className="res-card">
              <div className="barlab">Share of Voice over time</div>
              <SovTimeline
                points={history}
                brandNames={brandNames}
                selfBrandId={result.self.brandId}
                needMoreLabel="Run this prompt again later to see the trend."
              />
            </div>
          )}

          {classify && (
            <div className="res-card">
              <div className="barlab">Conversion citation analysis</div>
              <div className="cls-wrap">
                {result.perEngine
                  .filter((e) => !e.error)
                  .map((e) => {
                    const classified = e.mentions.filter(
                      (m) => m.mentioned && "citationClass" in m,
                    ) as Classifiedish[];
                    if (classified.length === 0) return null;
                    return (
                      <div key={e.engine}>
                        <div className="cls-eng">{e.engine}</div>
                        <div className="cls-pills">
                          {classified.map((m) => (
                            <span key={m.brandId} className={`cpill ${m.citationClass ?? "neutral"}`}>
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

          <div className="callout">
            🏆 Top brand: <b>{result.topBrandId ? brandNames.get(result.topBrandId) ?? result.topBrandId : "none"}</b>
            {" · "}📉 You (<b>{brandNames.get(result.self.brandId) ?? result.self.brandId}</b>): SoV{" "}
            <b>{Math.round(result.self.shareOfVoice * 100)}%</b> · mentioned in {result.self.mentionedInEngines}/
            {result.perEngine.length} engines · best rank {result.self.bestRank ?? "not shown"}
          </div>
        </div>
      )}
    </>
  );
}
