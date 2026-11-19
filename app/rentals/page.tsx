import { Footer, Header, PageHead } from "../site-components";
import { ForestTheme } from "../astryx/themes";
import { ArrowRight, Building, Home, type LucideIcon } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

export const dynamic = "force-static";

export const metadata = {
  title: "Rentals | ASMS‑ROUNAQH",
  description: "Corporate and domestic rentals around Chennai through ASMS‑ROUNAQH: offices, commercial space, homes and apartments.",
  alternates: { canonical: "/rentals" },
};

const enquire = (interest: string) => `/contact?category=${encodeURIComponent("Rentals")}&interest=${encodeURIComponent(interest)}`;

const RENTALS: { id: string; title: string; Icon: LucideIcon; text: string; looking: string; letting: string }[] = [
  {
    id: "corporate",
    title: "Corporate rentals",
    Icon: Building,
    text: "Offices, showrooms, warehouses and staff accommodation on lease for companies. Tell us the size, location, budget and move-in date, and we will share spaces that fit.",
    looking: "Corporate rental",
    letting: "Letting a commercial property",
  },
  {
    id: "domestic",
    title: "Domestic rentals",
    Icon: Home,
    text: "Apartments and independent houses to rent for families and individuals. Tell us the area, number of bedrooms and budget you have in mind, and we will come back with options.",
    looking: "Home to rent",
    letting: "Letting a home",
  },
];

export default function RentalsPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead crumb="Rentals" title="Property to rent around Chennai" lead="Spaces for businesses and homes for families. Rental listings are shared on request, so tell us what you need." />

        <section className="band band--tight" aria-label="Rentals">
          <div className="page">
            <Grid columns={{ minWidth: 320, repeat: "fit" }} gap={4}>
              {RENTALS.map(({ id, title, Icon, text, looking, letting }) => (
                <Card key={id} padding={6} className="service-card">
                  <VStack gap={4} height="100%">
                    <span className="type-icon"><Icon size={24} aria-hidden="true" /></span>
                    <VStack gap={2}><Heading level={2} id={id}>{title}</Heading><Text color="secondary" as="p">{text}</Text></VStack>
                    <div className="card-foot">
                      <HStack gap={2} wrap="wrap">
                        <Button variant="primary" href={enquire(looking)} label="I'm looking to rent" icon={<ArrowRight size={16} />} />
                        <Button variant="ghost" href={enquire(letting)} label="I have a property to let" />
                      </HStack>
                    </div>
                  </VStack>
                </Card>
              ))}
            </Grid>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="next-title">
            <div className="page">
              <HStack gap={6} hAlign="between" vAlign="center" wrap="wrap">
                <VStack gap={2} className="measure">
                  <Heading level={2} type="display-3" id="next-title">Looking to buy instead?</Heading>
                  <Text type="large" color="secondary" as="p">Browse plots, homes, land and commercial property for sale, each with its price, area and document status.</Text>
                </VStack>
                <HStack gap={2} wrap="wrap"><Button href="/properties" label="Browse properties" variant="primary" /><Button href="/sell" label="Sell a property" variant="ghost" /></HStack>
              </HStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      <Footer />
    </>
  );
}
