import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Trustela",
  description: "How Trustela collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 14, 2026">
      <p>
        This policy explains what personal data Trustela (&quot;we&quot;, &quot;us&quot;) collects,
        how we use it, and the choices you have. It applies to trustela.vercel.app and the Trustela
        application.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your email address (via magic-link sign-in or Google
          OAuth). If you sign in with Google we receive your email and basic profile from Google;
          we never see your Google password.
        </li>
        <li>
          <strong>Service inputs</strong> — the brand names, competitor names, website URLs, and
          prompts you register for analysis.
        </li>
        <li>
          <strong>Analysis results</strong> — AI engine responses, mention counts, rankings, and
          classifications generated for your prompts, stored so we can show trends over time.
        </li>
        <li>
          <strong>Billing data</strong> — handled by Stripe. We store your Stripe customer ID,
          subscription plan, and status. We never see or store your full card number.
        </li>
        <li>
          <strong>Technical data</strong> — standard server logs (IP address, browser type,
          timestamps) and cookies required for sign-in sessions and the one-free-analysis limit.
          We do not use advertising or cross-site tracking cookies.
        </li>
      </ul>

      <h2>2. How we use data</h2>
      <ul>
        <li>To provide the Service: run your prompts, compute metrics, and show your history.</li>
        <li>To manage subscriptions, billing, trials, and plan limits.</li>
        <li>To send transactional email (sign-in links, billing notices). No marketing email without consent.</li>
        <li>To secure and debug the Service.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2>3. Processors we rely on</h2>
      <ul>
        <li><strong>Supabase</strong> — authentication and database hosting.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Stripe</strong> — payment processing.</li>
        <li>
          <strong>OpenAI and Perplexity</strong> — your prompts (and brand names contained in them)
          are sent to these AI providers to produce analysis results.
        </li>
      </ul>

      <h2>4. Retention and deletion</h2>
      <p>
        We keep your data while your account is active. You can request deletion of your account
        and associated data at any time by emailing us; we will delete it within 30 days except
        where retention is required by law (e.g. billing records).
      </p>

      <h2>5. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct, export, or delete
        your personal data, and to object to or restrict certain processing. Contact us to exercise
        these rights.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit (TLS) and at rest by our hosting providers. Access to
        production data is limited to the operator.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update this policy; material changes will be announced in the app or by email. See
        also our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>8. Contact</h2>
      <p>
        Privacy questions or requests:{" "}
        <a href="mailto:hain010106@gmail.com">hain010106@gmail.com</a>
      </p>
    </LegalPage>
  );
}
