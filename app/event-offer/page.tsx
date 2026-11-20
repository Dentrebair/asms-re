import { Heading, Text } from "@astryxdesign/core/Text";
import { Link } from "@astryxdesign/core/Link";
import { BRAND } from "../site-components";
import PageForm from "./page-form";
import { BigCountdown } from "./event-form";

export const dynamic = "force-static";

export const metadata = {
  title: "25% off your brokerage commission: event exclusive | ASMS‑ROUNAQH",
  description: "Register by 11:59 PM IST on 21 November 2026 to claim 25% off ASMS‑ROUNAQH’s real estate brokerage commission on an eligible property transaction.",
  alternates: { canonical: "/event-offer" },
};

// Draft terms for ASMS to confirm: what is discounted, who qualifies and how long
// the claim stays valid.
const TERMS = [
  "25% off the brokerage commission payable to ASMS‑ROUNAQH, not the property’s price. Example: a ₹2,00,000 commission becomes ₹1,50,000.",
  "Register by 11:59 PM IST on 21 November 2026. One registration per WhatsApp number; the benefit is personal and not transferable.",
  "Applies to one eligible purchase or sale handled by ASMS‑ROUNAQH, with the brokerage agreement signed within 12 months of registering.",
  "Quote your claim reference when you engage ASMS. The final discount is confirmed in your brokerage agreement; not combinable with other offers or exchangeable for cash.",
];

/**
 * The event landing page: one job, registering for the offer. No site menu or
 * popup, the benefit and the form on the first screen, short terms below.
 */
export default function EventOfferPage() {
  return (
    <div className="event-page">
      <a className="skip" href="#claim">Skip to the registration form</a>
      <header className="event-top">
        <div className="page event-top-inner">
          <a href="/" aria-label={`${BRAND} home`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser */}
            <img className="brand-logo" src="/brand/logo-script.webp" alt={BRAND} width={260} height={160} />
          </a>
          <span className="event-tag">Event exclusive</span>
        </div>
      </header>

      <main id="main">
        <section className="event-hero" aria-labelledby="event-title">
          <div className="page event-hero-grid">
            <div className="event-pitch">
              <p className="event-kicker">ASMS‑ROUNAQH · Exclusive real estate event offer</p>
              <h1 id="event-title"><span className="event-offer-big">25% OFF</span><span className="event-offer-sub">your brokerage commission</span></h1>
              <p className="event-lead">Register now to claim a 25% reduction on the commission payable to ASMS when an eligible property transaction is completed.</p>
              <BigCountdown />
            </div>

            <div className="event-card" id="claim">
              <Heading level={2}>Claim your exclusive offer</Heading>
              <Text type="supporting" as="p">Just three details. No login or OTP required.</Text>
              <PageForm />
            </div>
          </div>
        </section>

        <section className="event-terms-band" aria-labelledby="terms">
          <div className="page measure">
            <Heading level={2} id="terms">Offer terms</Heading>
            <ol className="event-terms">{TERMS.map((t) => <li key={t}>{t}</li>)}</ol>
          </div>
        </section>
      </main>

      <footer className="event-foot">
        <div className="page">
          <Text type="supporting" as="p">© {BRAND} · <Link href="/">Visit the website</Link> · <Link href="/privacy">Privacy notice</Link> · <Link href="/terms">Terms of use</Link></Text>
        </div>
      </footer>
    </div>
  );
}
