import { Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

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
        <PageHead crumb="Contact" title="Ask about a property or a product" lead="Share the essentials and the team will guide the next conversation." />

        <section className="band band--tight" aria-label="Enquiry">
          <div className="page">
            <div className="split split--form">
              <Card padding={6} elevation="med"><EnquiryForm /></Card>
              <VStack gap={3}>
                <Heading level={2}>Other ways to reach us</Heading>
                {[
                  { icon: Phone, title: "Call", line: COMPANY.phone, note: "Property and product enquiries", href: COMPANY.phoneHref },
                  { icon: MessageCircle, title: "WhatsApp", line: "Chat with the team", note: "Send a listing reference or a photo", href: `https://wa.me/${COMPANY.whatsapp}`, external: true },
                  { icon: Mail, title: "Email", line: COMPANY.email, note: "Detailed requirements and documents", href: `mailto:${COMPANY.email}` },
                  { icon: MapPin, title: "Registered office", line: COMPANY.address.join(", "), note: "Visits by prior appointment · Open in Maps", href: COMPANY.mapHref, external: true },
                ].map(({ icon: Icon, title, line, note, href, external }) => (
                  <ClickableCard key={title} href={href} label={`${title}: ${line}`} padding={4} {...(external ? { target: "_blank" } : {})}>
                    <HStack gap={4} vAlign="center">
                      <span className="type-icon"><Icon size={22} aria-hidden="true" /></span>
                      <VStack gap={0}>
                        <Text type="supporting">{title}</Text>
                        <Text weight="bold">{line}</Text>
                        <Text type="supporting">{note}</Text>
                      </VStack>
                    </HStack>
                  </ClickableCard>
                ))}
              </VStack>
            </div>
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
