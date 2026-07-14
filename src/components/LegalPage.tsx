// 법률 문서(약관·개인정보·환불) 공용 셸 — 심플한 정적 레이아웃.
import Link from "next/link";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tl">
      <nav className="nav">
        <div className="wrap">
          <div className="row">
            <Link className="brand" href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="logo">🍷</span> Trustela
            </Link>
            <div className="links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/refunds">Refunds</Link>
            </div>
            <Link className="btn btn-ghost" href="/login">Log in</Link>
          </div>
        </div>
      </nav>

      <main className="legal">
        <div className="wrap">
          <h1>{title}</h1>
          <p className="legal-updated">Last updated: {updated}</p>
          {children}
        </div>
      </main>

      <footer>
        <div className="wrap">
          <div className="row">
            <div className="brand" style={{ fontSize: "16px" }}><span className="logo">🍷</span> Trustela</div>
            <div className="foot-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/refunds">Refunds</Link>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
