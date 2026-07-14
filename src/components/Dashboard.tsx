"use client";

// 로그인 후 작업 공간. 마케팅 없이 도구만:
// ① 브랜드 셋업(경쟁사·프롬프트 자동 발굴) ② 분석 도구+추적 목록 ③ 플랜 관리.
import { useEffect, useState } from "react";
import Analyzer, { type AnalyzerPrefill } from "@/components/Analyzer";
import AuthNav from "@/components/AuthNav";
import { startPlanCheckout } from "@/lib/billing/checkoutClient";

interface Discovery {
  brand: string | null;
  competitors: string[];
  prompts: string[];
}

export default function Dashboard() {
  // 브랜드 셋업 입력 — URL/브랜드/제품 중 하나만 있어도 발굴 가능.
  const [siteUrl, setSiteUrl] = useState("");
  const [brand, setBrand] = useState("");
  const [product, setProduct] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<Discovery | null>(null);

  // Analyzer 폼에 내려보낼 값(발굴 결과 적용용)
  const [prefill, setPrefill] = useState<AnalyzerPrefill | undefined>(undefined);

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  // 결제 복귀 처리: ?billing=success 면 확인 메시지.
  // setState 는 비동기 콜백에서 호출(렌더 캐스케이드 방지 — lint 규칙 준수).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "success") return;
    window.history.replaceState({}, "", window.location.pathname);
    const t = window.setTimeout(() => {
      setBillingMsg("🎉 You're subscribed! Your plan is active — start adding auto-run prompts.");
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  async function discover() {
    setDiscovering(true);
    setDiscoverError(null);
    setDiscovery(null);
    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: siteUrl, brand, product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      const found: Discovery = {
        brand: (data.brand ?? null) as string | null,
        competitors: (data.competitors ?? []) as string[],
        prompts: (data.prompts ?? []) as string[],
      };
      setDiscovery(found);
      // URL 만 넣었으면 추론된 브랜드명을 입력칸에도 되채워 준다.
      const selfName = brand.trim() || found.brand || "";
      if (!brand.trim() && found.brand) setBrand(found.brand);
      // 브랜드·경쟁사는 곧바로 분석 폼에 적용, 프롬프트는 칩에서 골라 넣는다.
      setPrefill({
        ...(selfName ? { selfName } : {}),
        competitors: found.competitors.join(", "),
        prompt: found.prompts[0],
      });
    } catch (err) {
      setDiscoverError((err as Error).message);
    } finally {
      setDiscovering(false);
    }
  }

  function applyPrompt(p: string) {
    setPrefill((cur) => ({ ...cur, prompt: p }));
    document.querySelector("#analyze")?.scrollIntoView({ behavior: "smooth" });
  }

  async function startCheckout(plan: "starter" | "growth" | "pro") {
    setCheckoutBusy(true);
    setBillingMsg(null);
    const result = await startPlanCheckout(plan); // Paddle 오버레이 결제창.
    if (!result.ok && result.message) setBillingMsg(result.message);
    setCheckoutBusy(false);
  }

  return (
    <div className="tl app">
      {/* NAV */}
      <nav className="nav">
        <div className="wrap">
          <div className="row">
            <a className="brand" href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="logo">🍷</span> Trustela
            </a>
            <div className="links">
              <a href="#setup">Brand setup</a>
              <a href="#analyze">Analyze</a>
              <a href="#plans">Plans</a>
            </div>
            <AuthNav />
          </div>
        </div>
      </nav>

      {billingMsg && (
        <div className="wrap" style={{ marginTop: 20 }}>
          <div className="billing-banner" style={{ maxWidth: "none", margin: 0 }}>
            <span>{billingMsg}</span>
            <button className="billing-x" onClick={() => setBillingMsg(null)} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}

      {/* BRAND SETUP — 경쟁사·프롬프트 자동 발굴 */}
      <section className="app-band" id="setup">
        <div className="wrap">
          <div className="app-head">
            <span className="eyebrow">Brand setup</span>
            <h2>Tell us what you sell — we&apos;ll find the rest</h2>
            <p>Enter your brand and product. We&apos;ll discover your competitors and suggest the prompts shoppers actually ask AI.</p>
          </div>

          <div className="toolcard">
            <div className="field">
              <label className="field-label">Your website <span className="hint">(recommended — we&apos;ll figure out the rest)</span></label>
              <input
                className="input"
                placeholder="e.g. acmewines.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <div className="setup-or"><span>or tell us directly — any one field is enough</span></div>
            <div className="grid2">
              <div className="field">
                <label className="field-label">Your brand</label>
                <input
                  className="input"
                  placeholder="e.g. Acme Wines"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">What you sell <span className="hint">(product or category)</span></label>
                <input
                  className="input"
                  placeholder="e.g. alcohol-free wine"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </div>
            </div>
            <div className="tool-actions" style={{ marginTop: 4 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={discover}
                disabled={discovering || (!siteUrl.trim() && !brand.trim() && !product.trim())}
              >
                {discovering ? "Searching the market…" : "✨ Find competitors & prompts"}
              </button>
            </div>

            {discoverError && <p className="error-box" style={{ margin: "16px 0 0", maxWidth: "none" }}>⚠️ {discoverError}</p>}

            {discovery && (
              <div className="discover-out">
                <div className="discover-block">
                  <div className="barlab">Competitors found <span className="hint-inline">— applied to the analyzer below</span></div>
                  <div className="sugg-list">
                    {discovery.competitors.map((c) => (
                      <span key={c} className="chip on"><span className="tick">✓</span>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="discover-block">
                  <div className="barlab">Suggested prompts <span className="hint-inline">— click one to analyze it</span></div>
                  <div className="sugg-prompts">
                    {discovery.prompts.map((p) => (
                      <button key={p} type="button" className="sugg-prompt" onClick={() => applyPrompt(p)}>
                        <span className="sp-ic">💬</span>
                        <span className="sp-text">{p}</span>
                        <span className="sp-go">Analyze →</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ANALYZE */}
      <section className="app-band" id="analyze">
        <div className="wrap">
          <div className="app-head">
            <span className="eyebrow">Analyze</span>
            <h2>Run a prompt against the AI engines</h2>
            <p>See who gets recommended, add prompts to your weekly auto-run schedule, and watch the trend build.</p>
          </div>
          <Analyzer mode="app" prefill={prefill} />
        </div>
      </section>

      {/* PLANS */}
      <section className="app-band" id="plans">
        <div className="wrap">
          <div className="app-head">
            <span className="eyebrow">Plans</span>
            <h2>Upgrade when you need more prompts</h2>
            <p>Manage or cancel anytime from the Billing button in the top bar.</p>
          </div>
          <div className="prices">
            <div className="price">
              <div className="pn">Starter</div>
              <div className="pp">$39<span className="per">/mo</span></div>
              <ul><li>10 prompts</li><li>ChatGPT + Perplexity</li><li>Weekly auto-runs</li><li>SoV &amp; rank tracking</li></ul>
              <button className="btn btn-ghost" onClick={() => startCheckout("starter")} disabled={checkoutBusy}>Start free trial</button>
            </div>
            <div className="price feat">
              <div className="feat-tag">Most popular</div>
              <div className="pn">Growth</div>
              <div className="pp">$99<span className="per">/mo</span></div>
              <ul><li>50 prompts</li><li>All engines + Gemini</li><li>Conversion citation analysis</li><li>Time-series charts</li><li>5 competitors</li></ul>
              <button className="btn btn-primary" onClick={() => startCheckout("growth")} disabled={checkoutBusy}>Start free trial</button>
            </div>
            <div className="price">
              <div className="pn">Pro</div>
              <div className="pp">$199<span className="per">/mo</span></div>
              <ul><li>200 prompts</li><li>Daily auto-runs</li><li>API access</li><li>Review-trust certification (add-on)</li></ul>
              <button className="btn btn-ghost" onClick={() => startCheckout("pro")} disabled={checkoutBusy}>Start free trial</button>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="row">
            <div className="brand" style={{ fontSize: "16px" }}><span className="logo">🍷</span> Trustela</div>
            <div className="foot-links">
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="/refunds">Refunds</a>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
