import { Footer, Header } from "../site-components";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import PageForm from "./page-form";

export const dynamic = "force-static";

export const metadata = {
  title: "25% off brokerage: 21 November event offer | ASMS‑ROUNAQH",
  description: "Register on 21 November 2026 to claim 25% off ASMS‑ROUNAQH’s real estate brokerage commission on an eligible property transaction.",
  alternates: { canonical: "/event-offer" },
};

// Draft terms for ASMS to confirm (see the event brief): what is discounted, who
// qualifies and for how long the claim stays valid.
const TERMS = [
  "The offer is 25% off ASMS‑ROUNAQH’s brokerage commission. It is not a discount on the property’s price. For example, a ₹2,00,000 commission becomes ₹1,50,000.",
  "Register between 12:00 AM and 11:59 PM IST on 21 November 2026. Registration closes automatically after that.",
  "One registration per WhatsApp number. The benefit is personal to the person registered and cannot be transferred.",
  "It applies to one eligible property purchase or sale handled by ASMS‑ROUNAQH, where you are ASMS’s client and the brokerage agreement is signed within 12 months of registration.",
  "Quote your registration ID when you engage ASMS. The final commission and discount are confirmed in your brokerage agreement.",
  "The offer cannot be combined with other discounts or exchanged for cash. ASMS‑ROUNAQH may verify the registration before applying it.",
];

export default function EventOfferPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="band event-hero" aria-labelledby="event-title">
          <div className="page">
            <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={8}>
              <VStack gap={4} className="measure">
                <Text type="supporting" as="p" className="event-kicker">ASMS‑ROUNAQH · Exclusive event offer · 21 November 2026</Text>
                <h1 id="event-title" className="event-offer-big">25% OFF</h1>
                <Heading level={2} type="display-3">Our real estate brokerage commission</Heading>
                <Text type="large" as="p">Register on 21 November to claim this exclusive benefit on an eligible property transaction. It takes three details and under 20 seconds, with no sign-in.</Text>
                <VStack gap={2}>
                  <Heading level={3}>How it works</Heading>
                  <ol className="event-steps">
                    <li>Enter your name, company and WhatsApp number.</li>
                    <li>Get your registration ID on screen straight away.</li>
                    <li>Quote it when you buy or sell through ASMS‑ROUNAQH.</li>
                  </ol>
                </VStack>
              </VStack>
              <Card padding={6} className="event-card">
                <VStack gap={2}>
                  <Heading level={2}>Register to claim your offer</Heading>
                  <PageForm />
                </VStack>
              </Card>
            </Grid>
          </div>
        </section>

        <section className="band band--tight" aria-labelledby="terms">
          <div className="page measure">
            <VStack gap={3}>
              <Heading level={2} id="terms">Offer terms</Heading>
              <ol className="event-terms">{TERMS.map((t) => <li key={t}><Text as="span">{t}</Text></li>)}</ol>
              <Text type="supporting" as="p">Your name, company and WhatsApp number are used only to record this offer and to contact you about it. Registering does not sign you up for promotional WhatsApp messages. See the privacy notice for how to ask us to delete your details.</Text>
            </VStack>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
