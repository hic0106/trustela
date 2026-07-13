"use client";

// 네비게이션 우측 인증 컨트롤. 세션이 있으면 이메일+로그아웃, 없으면 Log in.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 세션 확인 전에는 자리만 잡아 레이아웃 흔들림 방지.
  if (!ready) return <span className="auth-nav-slot" aria-hidden />;

  if (!email) {
    return (
      <a className="btn btn-primary" href="/login">
        Log in
      </a>
    );
  }

  async function manageBilling() {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.location.href = data.url as string;
  }

  return (
    <div className="auth-nav">
      <span className="auth-nav-email" title={email}>
        {email}
      </span>
      <button className="btn btn-ghost auth-nav-out" type="button" onClick={manageBilling}>
        Billing
      </button>
      <form action="/auth/signout" method="post">
        <button className="btn btn-ghost auth-nav-out" type="submit">
          Log out
        </button>
      </form>
    </div>
  );
}
