import { COMPANY, SERVICES } from "@/lib/company";
import { Cog, Hammer, Lightbulb, PencilRuler, type LucideIcon } from "lucide-react";
import { BRAND, Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";


export const dynamic = "force-static";

export const metadata = {
  title: "About | ASMS‑ROUNAQH",
  description: "ASMS‑ROUNAQH, Chennai: a construction and development business continuing a legacy since 1885.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead crumb="About" title={`Continuing a legacy since ${COMPANY.since}`} lead="Real expertise, real estate and real buildings, from one Chennai business." />

        <section className="band band--tight" aria-label="About the company">
          <div className="page">
            <VStack gap={10}>
              <div className="split">
              <VStack gap={4} className="measure">
                <Text type="large" as="p">{BRAND} is a construction and development business built on trust and experience. Its work has spanned residential colonies for the Armed Forces, religious structures, heritage buildings and modern engineered construction.</Text>
                <Text color="secondary" as="p">The organisation has been led for more than three decades by {COMPANY.leader}, with a commitment to quality, responsibility and continuous progress. Today it combines that experience with new technology, and is introducing 3D concrete printing as a modern way to build.</Text>
              </VStack>
              <Card padding={6} variant="muted">
                <Grid columns={2} gap={6}>
                  {[[String(COMPANY.since), "legacy began"], ["30+", "years under the current leadership"], [String(SERVICES.length), "lines of building work"], ["3", "divisions: property, products and services"]].map(([n, l]) => (
                    <VStack key={l} gap={0}><Text type="display-3" weight="bold" color="accent">{n}</Text><Text type="supporting">{l}</Text></VStack>
                  ))}
                </Grid>
              </Card>
              </div>
              <VStack gap={5}>
                <Heading level={2} type="display-3">How we work</Heading>
                <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={4}>
                  {WAYS.map(({ icon: Icon, title, text }) => (
                    <Card key={title} padding={6}>
                      <VStack gap={3}><span className="type-icon"><Icon size={22} aria-hidden="true" /></span><Heading level={3}>{title}</Heading><Text color="secondary" as="p">{text}</Text></VStack>
                    </Card>
                  ))}
                </Grid>
              </VStack>
              <VStack gap={3} className="measure">
                <Heading level={2} type="display-3">Property and materials, from builders</Heading>
                <Text color="secondary" as="p">The same understanding of land and construction sits behind the properties and construction products on this site: listings reviewed before they go live, and materials described by grade and standard.</Text>
              </VStack>
            </VStack>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="visit-title">
            <div className="page">
              <HStack gap={6} hAlign="between" vAlign="center" wrap="wrap">
                <VStack gap={2} className="measure">
                  <Heading level={2} type="display-3" id="visit-title">Registered office</Heading>
                  <Text type="large" color="secondary" as="p">{COMPANY.address.join(", ")}. Call or WhatsApp {COMPANY.phone}, or write to {COMPANY.email}.</Text>
                </VStack>
                <HStack gap={2} wrap="wrap"><Button href="/contact" label="Contact the team" variant="primary" /><Button href="/services" label="Our services" variant="ghost" /></HStack>
              </HStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      <Footer />
    </>
  );
}

const WAYS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Hammer, title: "Pioneering craftsmanship", text: "Practical experience with a commitment to quality construction." },
  { icon: Cog, title: "Progressive engineering", text: "Engineering knowledge applied to modern construction requirements." },
  { icon: PencilRuler, title: "Forward-thinking design", text: "Looking beyond conventional approaches to create purposeful spaces." },
  { icon: Lightbulb, title: "Ingenious engineering", text: "Practical and innovative solutions for the built environment." },
];
