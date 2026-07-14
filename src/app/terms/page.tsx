import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Trustela",
  description: "Terms of Service for the Trustela AI search visibility platform.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 14, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Trustela
        (&quot;the Service&quot;), an AI search visibility platform operated by Trustela
        (&quot;we&quot;, &quot;us&quot;). By creating an account or using the Service, you agree
        to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        Trustela runs the prompts you register against third-party AI search engines (such as
        ChatGPT and Perplexity), analyzes the responses, and reports how often and how favorably
        your brand is mentioned compared to competitors. Results reflect the output of third-party
        AI systems at the time of each run; we do not control and cannot guarantee what those
        systems say, nor that visibility metrics will improve.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide a valid email address to create an account. You are responsible for
        activity under your account and for keeping access to your sign-in email secure. You must
        be at least 18 years old, or the age of majority in your jurisdiction, to use the Service.
      </p>

      <h2>3. Subscriptions and billing</h2>
      <ul>
        <li>Paid plans are billed monthly in advance through our payment processor, Stripe.</li>
        <li>
          New subscriptions include a 14-day free trial. Your card is charged when the trial ends
          unless you cancel before then.
        </li>
        <li>
          Subscriptions renew automatically each month until cancelled. You can cancel anytime from
          the billing portal (the &quot;Billing&quot; button in the app); cancellation takes effect
          at the end of the current billing period.
        </li>
        <li>
          Plan limits (number of tracked prompts, run frequency, engines) are described on the
          pricing page and may be enforced automatically.
        </li>
        <li>Refunds are handled according to our <Link href="/refunds">Refund Policy</Link>.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>resell, scrape, or systematically extract the Service without our written consent;</li>
        <li>use the Service to violate any law or third-party rights;</li>
        <li>attempt to disrupt, overload, or gain unauthorized access to the Service;</li>
        <li>register prompts intended to generate unlawful, deceptive, or harmful content.</li>
      </ul>

      <h2>5. Your data</h2>
      <p>
        You retain ownership of the brand names, prompts, and other inputs you submit. You grant us
        the right to process them as needed to operate the Service (including sending prompts to
        third-party AI providers). Our handling of personal data is described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>6. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. AI-generated
        analysis (including competitor discovery and citation classification) may contain errors —
        verify important results before acting on them. We are not affiliated with OpenAI,
        Perplexity, Google, or Anthropic.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our total liability for any claim arising out of or
        relating to the Service is limited to the amount you paid us in the three (3) months before
        the claim arose. We are not liable for indirect, incidental, or consequential damages,
        including lost profits or lost business opportunities.
      </p>

      <h2>8. Termination</h2>
      <p>
        You may stop using the Service and cancel your subscription at any time. We may suspend or
        terminate accounts that violate these Terms. Upon termination we may delete your data after
        a reasonable retention period.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced in the app
        or by email; continued use after changes take effect constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms: <a href="mailto:hain010106@gmail.com">hain010106@gmail.com</a>
      </p>
    </LegalPage>
  );
}
