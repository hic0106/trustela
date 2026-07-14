import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Trustela",
  description: "Trustela's refund and subscription cancellation policy.",
};

export default function RefundsPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="July 14, 2026">
      <h2>1. Free trial</h2>
      <p>
        Every new subscription starts with a 14-day free trial. Cancel any time during the trial
        and you will not be charged at all.
      </p>

      <h2>2. Cancelling your subscription</h2>
      <p>
        You can cancel anytime from the billing portal — click the <strong>Billing</strong> button
        in the app. Cancellation takes effect at the end of your current billing period: you keep
        full access until then, and no further charges are made. We do not charge cancellation
        fees.
      </p>

      <h2>3. Refunds</h2>
      <ul>
        <li>
          <strong>Within 7 days of your first paid charge</strong> — if the Service isn&apos;t
          right for you, email us and we&apos;ll refund your first payment in full.
        </li>
        <li>
          <strong>After that</strong> — payments for a billing period already started are
          non-refundable, except where a refund is required by applicable consumer-protection law.
          Cancelling stops all future charges.
        </li>
        <li>
          <strong>Billing errors or duplicate charges</strong> — always refunded in full. Contact
          us with the charge details.
        </li>
        <li>
          <strong>Extended outages</strong> — if the Service is materially unavailable for a
          prolonged period during your billing cycle, contact us and we&apos;ll credit or refund a
          fair portion at our discretion.
        </li>
      </ul>

      <h2>4. How refunds are issued</h2>
      <p>
        Refunds are issued to the original payment method via Stripe, normally within 5–10 business
        days depending on your card issuer.
      </p>

      <h2>5. Contact</h2>
      <p>
        Refund requests: <a href="mailto:hain010106@gmail.com">hain010106@gmail.com</a> — include
        the email address on your account. See also our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
