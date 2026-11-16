import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { COMPANY } from "@/lib/company";
import { HERO_IMAGE, areaLabel, isSample, priceLabel, properties } from "@/lib/content";
import { ForestTheme } from "./astryx/themes";
import { Footer, Header, PropertyCard, type Credit } from "./site-components";

// Library photograph for the products showcase (Wikimedia Commons), credited in the footer.
const STEEL_PHOTO = { src: "/showcase-steel.webp", width: 3171, height: 1953 };
const HERO_CREDIT: Credit = { label: "Apartments on OMR, Chennai", artist: "Joel Samuel Raj", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:An_apartment_in_OMR.jpg" };
const STEEL_CREDIT: Credit = { label: "Steel reinforcement bars", artist: "W.carter", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:A_bunch_of_rebar_up_close.jpg" };

const DIVISIONS = [
  { title: "Real estate", text: "For buyers and investors: land and homes with the details you need to evaluate them.", href: "/properties" },
  { title: "Construction products", text: "For builders and businesses: materials and engineered products with clear specifications.", href: "/products" },
  { title: "Construction services", text: "For projects of purpose: conventional builds through to specialist engineering work.", href: "/services" },
];

const PROMISES = [
  { title: "Transparent information", text: "Price, area and specifications in one consistent, readable format." },
  { title: "Practical expertise", text: "Conversations about land and materials grounded in real construction knowledge." },
  { title: "Direct guidance", text: "You speak with the team responsible, from the first question through the next step." },
  { title: "Evidence-led trust", text: "Document status stated plainly, and an independent legal review always recommended." },
];

export const dynamic = "force-static";

export default function Home() {
  const listing = properties[0];
  const sheet = sheetRows(listing);
  // The first six live listings (featured, then newest); any without photos go to the end.
  const homeGrid = [...properties.slice(0, 6)].sort((a, b) => Number(!a.images.length) - Number(!b.images.length));

  return (
    <>
      <Header />
      <main id="main">
        <link rel="preload" as="image" href={HERO_IMAGE} type="image/webp" fetchPriority="high" />

        <section className="hero" aria-labelledby="hero-title">
          <figure className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMAGE} width={2000} height={1324} alt="Apartment towers along Chennai's OMR under a monsoon sky" fetchPriority="high" />
          </figure>
          <div className="page">
            <ForestTheme>
              <div className="hero-plate">
                <VStack gap={5}>
                  <Heading level={1} type="display-1" id="hero-title" textWrap="balance">Chennai plots, homes and building supplies.</Heading>
                  <Text type="large" as="p">Checked listings and specified materials, from one accountable team.</Text>
                  <HStack gap={3} wrap="wrap">
                    <Button href="/properties" label="Browse properties" variant="primary" size="lg" />
                    <Button href="/products" label="Request a material quote" variant="secondary" size="lg" />
                  </HStack>
                </VStack>
              </div>
            </ForestTheme>
          </div>
        </section>

        <section className="band" aria-labelledby="listings-title">
          <div className="page">
            <VStack gap={8}>
              <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                <VStack gap={2}>
                  <Heading level={2} type="display-3" id="listings-title">Plots and homes for sale now</Heading>
                  <Text color="secondary" as="p">Price, area, location and document status on every listing.</Text>
                </VStack>
                <Button href="/properties" label={`See all ${properties.length} properties`} variant="secondary" />
              </HStack>
              {isSample && <Banner status="info" title="Design preview" description="These listings are samples until verified inventory is added." />}
              <ul className="card-grid" aria-label="Properties for sale">
                {homeGrid.map((p, i) => <li key={p.slug}><PropertyCard property={p} priority={i < 3} /></li>)}
              </ul>
            </VStack>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" id="divisions" aria-labelledby="divisions-title">
            <div className="page">
              <VStack gap={8}>
                <VStack gap={3}>
                  <Heading level={2} type="display-3" id="divisions-title">Land, materials and building, one team</Heading>
                  <Text type="large" color="secondary" as="p">ASMS&#8209;ROUNAQH brings property, construction materials and engineering services under one accountable relationship.</Text>
                  <Link href="/about" isStandalone>About the company</Link>
                </VStack>
                <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                  {DIVISIONS.map((d) => (
                    <ClickableCard key={d.title} href={d.href} label={`Explore ${d.title.toLowerCase()}`} padding={6}>
                      <VStack gap={3}>
                        <Heading level={3}>{d.title}</Heading>
                        <Text color="secondary" as="p">{d.text}</Text>
                        <Text color="accent" weight="bold">Explore →</Text>
                      </VStack>
                    </ClickableCard>
                  ))}
                </Grid>
              </VStack>
            </div>
          </section>
        </ForestTheme>

        <section className="showcase band" id="products" aria-labelledby="products-title">
          <figure className="showcase-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STEEL_PHOTO.src} width={STEEL_PHOTO.width} height={STEEL_PHOTO.height} alt="Ribbed steel reinforcement bars stacked side by side" loading="lazy" decoding="async" />
          </figure>
          <div className="page">
            <Card padding={8} elevation="high">
              <VStack gap={4}>
                <Heading level={2} type="display-3" id="products-title">Steel, roofing and concrete, specified</Heading>
                <Text color="secondary" as="p">A catalogue for contractors, architects, industrial buyers and project owners, built to make comparison and quotation requests straightforward.</Text>
                <VStack gap={2}>
                  <Link href="/products?category=steel-peb" isStandalone>Steel and PEB components</Link>
                  <Link href="/products?category=roofing" isStandalone>Roofing and walling</Link>
                  <Link href="/products?category=concrete-finishing" isStandalone>Concrete and finishing</Link>
                </VStack>
                <div><Button href="/products" label="Browse the catalogue" variant="primary" /></div>
              </VStack>
            </Card>
          </div>
        </section>

        <section className="band" id="why-us" aria-labelledby="why-title">
          <div className="page">
            <Grid columns={{ minWidth: 340, repeat: "fit" }} gap={10} align="start">
              <VStack gap={6}>
                <VStack gap={3}>
                  <Heading level={2} type="display-3" id="why-title">What every listing tells you</Heading>
                  <Text type="large" color="secondary" as="p">No inflated claims and no artificial urgency, just details you can check.</Text>
                </VStack>
                <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={4}>
                  {PROMISES.map((p, i) => (
                    <Card key={p.title} variant="muted" padding={5}>
                      <VStack gap={2}>
                        <Text type="supporting" weight="bold" color="accent">0{i + 1}</Text>
                        <Heading level={3}>{p.title}</Heading>
                        <Text color="secondary" as="p">{p.text}</Text>
                      </VStack>
                    </Card>
                  ))}
                </Grid>
              </VStack>
              {sheet.length > 0 && (
                <Card padding={6} elevation="med">
                  <VStack gap={4}>
                    <VStack gap={1}>
                      <Text type="supporting">A real listing&apos;s fact sheet</Text>
                      <Heading level={3}>{listing ? `${listing.title}, ref. ${listing.reference}` : "A listing fact sheet"}</Heading>
                    </VStack>
                    <MetadataList>
                      {sheet.map((row) => <MetadataListItem key={row.label} label={row.label}>{row.value}</MetadataListItem>)}
                    </MetadataList>
                    {listing && <Link href={`/properties/${listing.slug}`} isStandalone>Open this listing</Link>}
                  </VStack>
                </Card>
              )}
            </Grid>
          </div>
        </section>

        <ForestTheme>
          <section className="band band--forest" id="contact" aria-labelledby="contact-title">
            <div className="page">
              <VStack gap={8}>
                <VStack gap={3}>
                  <Heading level={2} type="display-3" id="contact-title">Ask about a plot or a quote</Heading>
                  <Text type="large" color="secondary" as="p">Share a listing reference or a product specification, and the team replies directly.</Text>
                </VStack>
                <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                  <ClickableCard href="/properties" label="Explore properties" padding={6}>
                    <VStack gap={1}><Text type="supporting">Buying property</Text><Heading level={3}>Explore properties →</Heading></VStack>
                  </ClickableCard>
                  <ClickableCard href="/contact" label="Enquire about products" padding={6}>
                    <VStack gap={1}><Text type="supporting">Sourcing materials</Text><Heading level={3}>Enquire about products →</Heading></VStack>
                  </ClickableCard>
                </Grid>
                <Text as="p">
                  Call or WhatsApp <Link href={COMPANY.phoneHref}>{COMPANY.phone}</Link>, or write to <Link href={`mailto:${COMPANY.email}`}>{COMPANY.email}</Link>.
                </Text>
              </VStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      <Footer credits={[HERO_CREDIT, STEEL_CREDIT]} />
    </>
  );
}

function sheetRows(p: (typeof properties)[number] | undefined) {
  if (!p) return [];
  const doc = (label: string) => p.documents.find((d) => d.label.toLowerCase().includes(label))?.status;
  const rows: { label: string; value: string | null }[] = [
    { label: "Asking price", value: priceLabel(p) },
    { label: "Area", value: areaLabel(p) },
    { label: "Road width", value: p.roadWidthFt ? `${p.roadWidthFt} ft` : null },
    { label: "Floors allowed", value: p.floorsAllowed },
    { label: "Reference", value: p.reference },
    { label: "Site visits", value: "By prior appointment" },
    { label: "Layout approval", value: doc("layout") ?? p.approval },
    { label: "Independent legal review", value: doc("legal") ?? "Recommended for buyers" },
  ];
  return rows.filter((r): r is { label: string; value: string } => Boolean(r.value));
}
