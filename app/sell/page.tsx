import { Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Phone, PhoneCall } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";


export const dynamic = "force-static";

export const metadata = {
  title: "Sell a property | ASMS‑ROUNAQH",
  description: "List a plot, home, commercial space or agricultural land in and around Chennai with ASMS‑ROUNAQH. Every listing is reviewed before it goes live.",
  alternates: { canonical: "/sell" },
};

const sellHref = `/contact?category=${encodeURIComponent("Selling a property")}`;

export default function SellPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead crumb="Sell a property" title="Sell your property with ASMS‑ROUNAQH" lead="Homes, plots and commercial space, reviewed before buyers see them." />

        <section className="band band--tight" aria-labelledby="steps-title">
          <div className="page">
            <div className="split">
              <VStack gap={6}>
                <Heading level={2} type="display-3" id="steps-title">How listing works</Heading>
                <Stepper activeStep={0} orientation="vertical" label="How listing works">
                  {STEPS.map((step, i) => <Step key={step.title} step={i} label={step.title} description={step.text} />)}
                </Stepper>
              </VStack>
              <aside>
                <Card padding={6} elevation="med">
                  <VStack gap={4}>
                    <span className="type-icon"><PhoneCall size={24} aria-hidden="true" /></span>
                    <Heading level={2}>Start with a call</Heading>
                    <Text color="secondary" as="p">Online seller accounts are not open yet. Tell us about the property and the team will call you to take the details.</Text>
                    <Button href={sellHref} label="Request a callback" variant="primary" size="lg" width="100%" />
                    <Button href={COMPANY.phoneHref} label={`Call ${COMPANY.phone}`} width="100%" icon={<Phone size={16} />} />
                  </VStack>
                </Card>
              </aside>
            </div>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="after-title">
            <div className="page">
              <VStack gap={8}>
                <VStack gap={3} className="measure">
                  <Heading level={2} type="display-3" id="after-title">After it goes live</Heading>
                  <Text type="large" color="secondary" as="p">Buyers enquire through ASMS&#8209;ROUNAQH. We follow up every enquiry and keep you informed; buyers&rsquo; personal details are shared only with their permission.</Text>
                </VStack>
                <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
                  {AFTER.map((c, i) => (
                    <Card key={c.title} padding={6}>
                      <VStack gap={2}>{"step" in c && <Text type="supporting" weight="bold" color="accent">Step {i + 1}</Text>}<Heading level={3}>{c.title}</Heading><Text color="secondary" as="p">{c.text}</Text></VStack>
                    </Card>
                  ))}
                </Grid>
              </VStack>
            </div>
          </section>
        </ForestTheme>

      </main>
      <Footer />
    </>
  );
}

const STEPS = [
  { step: true, title: "Describe the property", text: "Type, location, price, area and the facts buyers of that type ask about: bedrooms for a home, road width and frontage for a plot, usable area for commercial space." },
  { step: true, title: "Add photos and documents", text: "Real photographs of the property. Patta, EC and approvals stay private: only our reviewers see them, never visitors." },
  { step: true, title: "We review, then publish", text: "We check the details and documents, ask for corrections where needed, and publish once everything is in order. Submitted is not the same as live." },
];
const AFTER = [
  { title: "See how it performs", text: "Views, saves and enquiries for your listing, counted the same way for every property." },
  { title: "Keep it current", text: "Price changes are reviewed before they appear, and we ask you to reconfirm availability regularly so nothing stale stays online." },
  { title: "Mark it sold", text: "Once it sells, the listing leaves search and stops taking enquiries." },
];
