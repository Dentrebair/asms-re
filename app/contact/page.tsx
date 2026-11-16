import { Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";

import { COMPANY } from "@/lib/company";
import EnquiryForm from "./enquiry-form";

export const dynamic = "force-static";

export const metadata = {
  title: "Contact | ASMS‑ROUNAQH",
  description: "Contact ASMS‑ROUNAQH about property opportunities or construction products.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead title="Ask about a property or a product" lead="Share the essentials and the team will guide the next conversation." />

        <section className="band band--tight" aria-label="Enquiry" style={{ paddingTop: 0 }}>
          <div className="page">
            <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={10} align="start">
              <VStack gap={5}>
                <Heading level={2} type="display-3">Clear answers begin with the right details</Heading>
                <Text color="secondary" as="p">Tell us your intended use, location or product specification. We respond with relevant information and no artificial urgency.</Text>
                <Card padding={5}>
                  <MetadataList>
                    <MetadataListItem label="Call or WhatsApp">
                      <VStack gap={1}><Link href={COMPANY.phoneHref}>{COMPANY.phone}</Link><Text type="supporting">For property and product enquiries. <Link href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</Link></Text></VStack>
                    </MetadataListItem>
                    <MetadataListItem label="Email">
                      <VStack gap={1}><Link href={`mailto:${COMPANY.email}`}>{COMPANY.email}</Link><Text type="supporting">For detailed requirements and documents</Text></VStack>
                    </MetadataListItem>
                    <MetadataListItem label="Registered office">
                      <VStack gap={1}><address style={{ fontStyle: "normal" }}>{COMPANY.address.join(", ")}</address><Text type="supporting">Visits by prior appointment. <Link href={COMPANY.mapHref} target="_blank" rel="noopener noreferrer">Open in Maps</Link></Text></VStack>
                    </MetadataListItem>
                  </MetadataList>
                </Card>
              </VStack>
              <Card padding={6} elevation="med"><EnquiryForm /></Card>
            </Grid>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="assure-title">
            <div className="page">
              <VStack gap={8}>
                <Heading level={2} type="display-3" id="assure-title">How we handle your enquiry</Heading>
                <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
                  {ASSURANCES.map((c, i) => (
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

const ASSURANCES = [
  { title: "Reference-led conversations", text: "Include the property reference so details, documents and site visits stay specific." },
  { title: "Specification-led quotations", text: "Share product type, dimensions, quantity and delivery location for a useful response." },
  { title: "Purpose-limited contact", text: "Your information is used only to understand and respond to the enquiry you submit." },
];
