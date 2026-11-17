import { SERVICES } from "@/lib/company";
import { Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { ArrowRight, Building2, Landmark, Printer, Church, HardHat, Warehouse, type LucideIcon } from "lucide-react";

const SERVICE_ICONS: Record<string, LucideIcon> = { "real-estate": Building2, construction: HardHat, peb: Warehouse, heritage: Landmark, religious: Church, "3dcp": Printer };
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";


export const dynamic = "force-static";

export const metadata = {
  title: "Services | ASMS‑ROUNAQH",
  description: "Real estate development, construction, PEB structures, heritage structures, religious architecture and 3D concrete printing from ASMS‑ROUNAQH, Chennai.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead crumb="Services" title="Development, construction and engineering" lead="Six lines of work, carried by decades of practical building experience." />

        <section className="band band--tight" aria-label="Services">
          <div className="page">
            <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={4}>
              {SERVICES.map((s) => {
                const Icon = SERVICE_ICONS[s.id] ?? HardHat;
                return (
                  <Card key={s.id} padding={6}>
                    <VStack gap={4} height="100%">
                      <span className="type-icon"><Icon size={24} aria-hidden="true" /></span>
                      <VStack gap={2}><Heading level={2} id={s.id}>{s.title}</Heading><Text color="secondary" as="p">{s.text}</Text></VStack>
                      <div className="card-foot">
                        <Button variant="ghost" href={`/contact?category=${encodeURIComponent("General enquiry")}&interest=${encodeURIComponent(s.title)}`} label="Discuss a project" icon={<ArrowRight size={16} />} />
                      </div>
                    </VStack>
                  </Card>
                );
              })}
            </Grid>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="next-title">
            <div className="page">
              <HStack gap={6} hAlign="between" vAlign="center" wrap="wrap">
                <VStack gap={2} className="measure">
                  <Heading level={2} type="display-3" id="next-title">Planning a project?</Heading>
                  <Text type="large" color="secondary" as="p">Tell us the site, the scale and the timeline, and the team will set up a conversation.</Text>
                </VStack>
                <HStack gap={2} wrap="wrap"><Button href={`/contact?category=${encodeURIComponent("General enquiry")}&interest=${encodeURIComponent("Construction project")}`} label="Discuss a project" variant="primary" /><Button href="/products" label="See construction products" variant="ghost" /></HStack>
              </HStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      <Footer />
    </>
  );
}
