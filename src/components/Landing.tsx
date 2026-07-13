"use client";

// 마케팅 랜딩 — 비로그인 방문자 전용(로그인 시 서버에서 /dashboard 로 리다이렉트).
// 익명 무료 1회 체험(Analyzer landing 모드) + 가격 → 결제는 로그인 후 진행.
import { useEffect, useState } from "react";
import Analyzer from "@/components/Analyzer";
import AuthNav from "@/components/AuthNav";

export default function Landing() {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  // Scroll-reveal for marketing blocks. Content is visible by default; we only
  // arm the animation once JS is running, and always guarantee reveal via a
  // fallback timer so nothing can get stuck invisible (e.g. if IO never fires).
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tl");
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".rv"));
    const revealAll = () => els.forEach((e) => e.classList.add("in"));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    root.classList.add("reveal-on"); // arm the hidden→visible transition
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => io.observe(e));

    // Safety net: if IO doesn't fire (backgrounded tab, etc.), reveal everything.
    const fallback = window.setTimeout(revealAll, 1600);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  // 가격 카드 → Stripe Checkout. 비로그인 시 로그인 페이지로.
  async function startCheckout(plan: "starter" | "growth" | "pro") {
    setCheckoutBusy(true);
    setBillingMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url as string; // Stripe 결제창으로 이동.
        return;
      }
      setBillingMsg(data.message ?? data.error ?? "Could not start checkout.");
    } catch {
      setBillingMsg("Could not start checkout. Please try again.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  return (
    <div className="tl">
      {/* NAV */}
      <nav className="nav">
        <div className="wrap">
          <div className="row">
            <div className="brand"><span className="logo">🍷</span> Trustela</div>
            <div className="links">
              <a href="#what">What you learn</a>
              <a href="#how">How it works</a>
              <a href="#results">Real results</a>
              <a href="#pricing">Pricing</a>
            </div>
            <AuthNav />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow rv">AI Search Visibility · GEO</div>
          <h1 className="rv d1">Shoppers don&apos;t Google anymore —<br />they <span className="hl">ask AI</span></h1>
          <p className="sub rv d2">
            Track whether ChatGPT and Perplexity recommend your brand, how you stack up against
            competitors, and whether those citations actually drive purchases — all in one dashboard.
          </p>
          <div className="cta-row rv d3">
            <a className="btn btn-primary btn-lg" href="#try">Start free analysis →</a>
            <a className="btn btn-ghost btn-lg" href="#how">See how it works</a>
          </div>
          <div className="engines-row rv d4">
            <span className="cap">AI search engines we track</span>
            <div className="logos">
              <span className="elogo"><span className="d" style={{ background: "#10a37f" }} />ChatGPT</span>
              <span className="elogo"><span className="d" style={{ background: "#20808d" }} />Perplexity</span>
              <span className="elogo"><span className="d" style={{ background: "#4285f4" }} />Gemini</span>
              <span className="elogo"><span className="d" style={{ background: "#d97757" }} />Claude</span>
            </div>
          </div>

          <div className="hero-mock rv d4">
            <div className="browser">
              <div className="tb"><span className="dot" /><span className="dot" /><span className="dot" /><span className="u">app.trustela.com/dashboard</span></div>
              <div className="dash">
                <div className="dash-head">
                  <div className="q">“What are the best alcohol-free wine brands?” <span>· You: Acme Wines</span></div>
                  <div className="eng">✓ ChatGPT · ✓ Perplexity</div>
                </div>
                <div className="kpi">
                  <div className="k"><div className="lab">Your Share of Voice</div><div className="val down">0%<small className="down"> not shown</small></div></div>
                  <div className="k"><div className="lab">Top competitor</div><div className="val">Noughty</div></div>
                  <div className="k"><div className="lab">Conversion citations</div><div className="val">2<small> found</small></div></div>
                </div>
                <div>
                  <div className="barlab">Share of Voice · vs competitors</div>
                  <div className="bar-row"><span className="bar-name">Noughty</span><span className="track"><i className="fill" style={{ width: "50%" }} /></span><span className="bar-val">50%</span></div>
                  <div className="bar-row"><span className="bar-name">Giesen</span><span className="track"><i className="fill" style={{ width: "25%" }} /></span><span className="bar-val">25%</span></div>
                  <div className="bar-row"><span className="bar-name">Zeronimo</span><span className="track"><i className="fill" style={{ width: "25%" }} /></span><span className="bar-val">25%</span></div>
                  <div className="bar-row"><span className="bar-name self">Acme Wines <span className="self">◀ you</span></span><span className="track"><i className="fill muted" style={{ width: "3%" }} /></span><span className="bar-val">0%</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOOK STATS */}
      <section className="band hook">
        <div className="wrap">
          <div className="g">
            <div className="stat rv"><div className="n">60%</div><div className="t">of Google searches now end without a click — AI answers for them.</div></div>
            <div className="stat rv d1"><div className="n">#1</div><div className="t">The first brand AI names captures the lion&apos;s share of conversions.</div></div>
            <div className="stat rv d2"><div className="n">0</div><div className="t">tools — that&apos;s what the typical brand uses to track what AI says about them. They&apos;re flying blind.</div></div>
          </div>
        </div>
      </section>

      {/* WHAT YOU LEARN */}
      <section className="band" id="what">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="eyebrow">Results</span>
            <h2>What can this dashboard tell you?</h2>
            <p>Not vague “AI marketing.” Four concrete numbers, returned to you.</p>
          </div>
          <div className="cards">
            <div className="ocard rv">
              <div className="ic">📊</div>
              <h3>Share of Voice</h3>
              <p>How often your brand appears in AI answers versus competitors, as a percentage — your real share of the conversation.</p>
              <div className="mini">
                <div className="mini-bar"><span>You</span><span className="t"><i style={{ width: "22%" }} /></span><span>22%</span></div>
                <div className="mini-bar"><span>Top</span><span className="t"><i style={{ width: "50%" }} /></span><span>50%</span></div>
              </div>
            </div>
            <div className="ocard rv d1">
              <div className="ic">🏅</div>
              <h3>Recommendation rank</h3>
              <p>Where AI names you when it lists brands. #1 and #4 are completely different worlds for conversion.</p>
              <div className="mini">
                <div className="mini-bar mono"><span>ChatGPT</span><span className="t"><i style={{ width: "100%" }} /></span><span>#1</span></div>
                <div className="mini-bar mono"><span>Perplexity</span><span className="t"><i style={{ width: "40%" }} /></span><span>#4</span></div>
              </div>
            </div>
            <div className="ocard rv d2">
              <div className="ic">✨</div>
              <h3>Conversion citations <span className="star">Only on Trustela</span></h3>
              <p>Not just a mention — we classify whether a citation actually makes people want to buy. We separate name-drops from real recommendations.</p>
              <div className="mini"><div className="mini-bar"><span style={{ color: "var(--up)" }}>● Conversion</span> <span style={{ color: "var(--ink-3)" }}>Neutral</span> <span style={{ color: "var(--down)" }}>Negative</span></div></div>
            </div>
            <div className="ocard rv d3">
              <div className="ic">📈</div>
              <h3>Trend over time</h3>
              <p>Whether you&apos;re improving week over week — proof that your content and PR turned into real AI visibility.</p>
              <div className="mini"><div className="mini-bar"><span>4 wks ago</span><span className="t"><i style={{ width: "8%" }} /></span><span>now</span><span className="t"><i style={{ width: "46%" }} /></span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="band hook" id="how">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="eyebrow">How it works</span>
            <h2>Three steps, done in minutes</h2>
          </div>
          <div className="steps">
            <div className="step rv"><div className="num">1</div><h3>Add a prompt</h3><p>Enter a question your customers might ask AI — like “recommend an alcohol-free wine.”</p></div>
            <div className="step rv d1"><div className="num">2</div><h3>Run AI automatically</h3><p>We actually query ChatGPT and Perplexity, then collect their answers and citations.</p></div>
            <div className="step rv d2"><div className="num">3</div><h3>Read the results</h3><p>SoV, rank, conversion citations, and trend in one dashboard. You&apos;ll see exactly what to fix.</p></div>
          </div>
        </div>
      </section>

      {/* TRY IT — real tool (anonymous, one free run) */}
      <section className="band" id="try">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="eyebrow">Try it now</span>
            <h2>Run it on your own brand</h2>
            <p>Just enter a prompt and your brands. No credit card, no signup.</p>
          </div>
          <Analyzer mode="landing" />
        </div>
      </section>

      {/* REAL RESULTS (placeholder) */}
      <section className="results-band" id="results">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="badge-soon">● Coming soon</span>
            <span className="eyebrow" style={{ display: "block" }}>Real results</span>
            <h2>How brands using Trustela did</h2>
            <p>Once customer data accumulates, we&apos;ll post anonymized, real improvements here. Below is an example of what that will look like.</p>
          </div>
          <div className="rcards">
            <div className="rcard rv"><span className="ex">Example</span><div className="big"><span className="u">+38%</span></div><div className="cap">Share of Voice in 8 weeks — from invisible to #2 in the market.</div><div className="who">— Alcohol-free beverage brand</div></div>
            <div className="rcard rv d1"><span className="ex">Example</span><div className="big">0 → <span className="u">#1</span></div><div className="cap">Became the first recommended brand across all three engines.</div><div className="who">— Skincare D2C</div></div>
            <div className="rcard rv d2"><span className="ex">Example</span><div className="big"><span className="u">2×</span></div><div className="cap">Doubled conversion citations — from mentions to real recommendations.</div><div className="who">— Home fragrance</div></div>
          </div>
          <p className="note">* The numbers above are examples, not real customer data. They&apos;ll be replaced with real results from beta brands soon.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="band" id="pricing">
        <div className="wrap">
          <div className="sec-head rv">
            <span className="eyebrow">Pricing</span>
            <h2>Start without the commitment</h2>
            <p>Enter at half the price of the competition. Scale up when you need to.</p>
          </div>
          {billingMsg && (
            <div className="billing-banner" style={{ marginBottom: 20 }}>
              <span>{billingMsg}</span>
              <button className="billing-x" onClick={() => setBillingMsg(null)} aria-label="Dismiss">✕</button>
            </div>
          )}
          <div className="prices">
            <div className="price rv">
              <div className="pn">Starter</div>
              <div className="pp">$39<span className="per">/mo</span></div>
              <ul><li>10 prompts</li><li>ChatGPT + Perplexity</li><li>Weekly auto-runs</li><li>SoV &amp; rank tracking</li></ul>
              <button className="btn btn-ghost" onClick={() => startCheckout("starter")} disabled={checkoutBusy}>Start free trial</button>
            </div>
            <div className="price feat rv d1">
              <div className="feat-tag">Most popular</div>
              <div className="pn">Growth</div>
              <div className="pp">$99<span className="per">/mo</span></div>
              <ul><li>50 prompts</li><li>All engines + Gemini</li><li>Conversion citation analysis</li><li>Time-series charts</li><li>5 competitors</li></ul>
              <button className="btn btn-primary" onClick={() => startCheckout("growth")} disabled={checkoutBusy}>Start free trial</button>
            </div>
            <div className="price rv d2">
              <div className="pn">Pro</div>
              <div className="pp">$199<span className="per">/mo</span></div>
              <ul><li>200 prompts</li><li>Daily auto-runs</li><li>API access</li><li>Review-trust certification (add-on)</li></ul>
              <button className="btn btn-ghost" onClick={() => startCheckout("pro")} disabled={checkoutBusy}>Start free trial</button>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final">
        <div className="wrap">
          <h2 className="rv">See whether AI recommends you — right now</h2>
          <p className="rv d1">Your first analysis is free. Once you see the results, what to fix becomes obvious.</p>
          <div className="cta-row rv d2"><a className="btn btn-primary btn-lg" href="#try">Start free analysis →</a></div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="row">
            <div className="brand" style={{ fontSize: "16px" }}><span className="logo">🍷</span> Trustela</div>
            <div>AI search visibility + review trust · © 2026</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
