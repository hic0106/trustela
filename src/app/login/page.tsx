"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="tl">
      <main className="auth-wrap">
        <div className="auth-card">
          <Link className="auth-brand" href="/">
            <span className="logo">🍷</span> Trustela
          </Link>

          {sent ? (
            <>
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-sub">
                We sent a magic sign-in link to <strong>{email}</strong>. Click it to continue —
                you can close this tab.
              </p>
              <button className="btn btn-ghost btn-lg auth-full" onClick={() => setSent(false)}>
                ← Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="auth-title">Log in or sign up</h1>
              <p className="auth-sub">No password. We&apos;ll email you a one-tap sign-in link.</p>

              <form onSubmit={sendMagicLink} className="auth-form">
                <input
                  className="input"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button className="btn btn-primary btn-lg auth-full" disabled={busy}>
                  {busy ? "Sending…" : "Email me a link →"}
                </button>
              </form>

              <div className="auth-or"><span>or</span></div>

              <button className="btn btn-ghost btn-lg auth-full" onClick={signInWithGoogle}>
                Continue with Google
              </button>
            </>
          )}

          {error && <p className="error-box">⚠️ {error}</p>}

          <p className="auth-fine">
            By continuing you agree to our terms. We only use your email to sign you in.
          </p>
        </div>
      </main>
    </div>
  );
}
