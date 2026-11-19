import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Carousel } from "@astryxdesign/core/Carousel";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ArrowRight, Building2, FileCheck2, HardHat, Home as HomeIcon, LandPlot, MessagesSquare, Phone, ShieldCheck, Tractor, type LucideIcon } from "lucide-react";
import { COMPANY, SERVICES } from "@/lib/company";
import { HERO_IMAGE, isSample, productCategories, productCount, properties } from "@/lib/content";
import { BUDGETS, CATEGORIES } from "@/lib/property";
import type { PropertyCategory } from "@/lib/content-types";
import { ForestTheme } from "./astryx/themes";
import HomeSearch from "./home-search";
import { Footer, Header, PropertyCard, type Credit } from "./site-components";

const HERO_CREDIT: Credit = { label: "Apartments on OMR, Chennai", artist: "Joel Samuel Raj", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:An_apartment_in_OMR.jpg" };

const TYPE_ICONS: Record<PropertyCategory, LucideIcon> = { residential: HomeIcon, plot: LandPlot, commercial: Building2, agricultural: Tractor };

const WHY: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileCheck2, title: "Facts upfront", text: "Price, area, location and document status on every listing, in one format." },
  { icon: ShieldCheck, title: "Reviewed before it goes live", text: "Details and documents checked; an independent legal review always recommended." },
  { icon: HardHat, title: "Builders, not just brokers", text: "Construction experience behind every conversation about land and materials." },
  { icon: MessagesSquare, title: "One team to talk to", text: "The people responsible reply directly, from first question to site visit." },
];

export const dynamic = "force-static";

export default function Home() {
  const byType = CATEGORIES.map((c) => ({ ...c, count: properties.filter((p) => p.category === c.id).length }));
  // Featured first (the content order), listings with photos ahead of those still waiting for them.
  const featured = [...properties.slice(0, 8)].sort((a, b) => Number(!a.images.length) - Number(!b.images.length));
  const credits = [HERO_CREDIT, ...productCategories.flatMap((c) => c.products.slice(0, 1)).flatMap((p) => (p.image?.credit ? [{ label: p.name, ...p.image.credit }] : []))];

  return (
    <>
      <Header />
      <main id="main">
        <link rel="preload" as="image" href={HERO_IMAGE} type="image/webp" fetchPriority="high" />

        {/* 1. Search hero */}
        <section className="search-hero" aria-labelledby="hero-title">
          <figure className="hero-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMAGE} width={2000} height={1324} alt="Apartment towers along Chennai's OMR under a monsoon sky" fetchPriority="high" />
          </figure>
          <div className="page">
            <VStack gap={6} hAlign="center">
              <ForestTheme>
                <VStack gap={3} hAlign="center">
                  <Heading level={1} type="display-1" id="hero-title" justify="center" textWrap="balance">Find property in and around Chennai</Heading>
                  <Text type="large" justify="center" as="p">Plots, homes, commercial and agricultural land, each with price, area and document status upfront.</Text>
                </VStack>
              </ForestTheme>
              <HomeSearch types={CATEGORIES.map((c) => ({ value: c.id, label: c.tab.replace("Apartments and houses", "Homes").replace("Plots and land", "Plots") }))} budgets={BUDGETS} />
            </VStack>
          </div>
        </section>

        {/* 2. Stats strip */}
        <section className="stats-strip" aria-label="ASMS‑ROUNAQH at a glance">
          <div className="page">
            <Grid columns={{ minWidth: 160, repeat: "fit" }} gap={4}>
              {[
                [String(COMPANY.since), "a family legacy in construction"],
                [String(properties.length), properties.length === 1 ? "verified listing live" : "verified listings live"],
                [String(productCount), "construction products"],
                [String(SERVICES.length), "lines of building work"],
              ].map(([n, label]) => (
                <VStack key={label} gap={0}>
                  <Text type="display-3" weight="bold" color="accent" hasTabularNumbers>{n}</Text>
                  <Text type="supporting">{label}</Text>
                </VStack>
              ))}
            </Grid>
          </div>
        </section>

        {/* 3. Browse by type */}
        <section className="band band--tight" aria-labelledby="types-title">
          <div className="page">
            <VStack gap={5}>
              <Heading level={2} type="display-3" id="types-title">Browse by property type</Heading>
              <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={3}>
                {byType.map((t) => {
                  const Icon = TYPE_ICONS[t.id];
                  return (
                    <ClickableCard key={t.id} href={`/properties?type=${t.id}`} label={`${t.tab}: ${t.count} listed`} padding={5}>
                      <HStack gap={4} vAlign="center">
                        <span className="type-icon"><Icon size={26} aria-hidden="true" /></span>
                        <VStack gap={0}>
                          <Heading level={3}>{t.tab}</Heading>
                          <Text type="supporting">{t.count === 0 ? "None listed right now" : `${t.count} listed`}</Text>
                        </VStack>
                      </HStack>
                    </ClickableCard>
                  );
                })}
              </Grid>
            </VStack>
          </div>
        </section>

        {/* 4. Featured listings */}
        <section className="band band--tight band--muted" aria-labelledby="listings-title">
          <div className="page">
            <VStack gap={5}>
              <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                <VStack gap={1}>
                  <Heading level={2} type="display-3" id="listings-title">Featured properties</Heading>
                  <Text color="secondary" as="p">Hand-picked from the listings live today.</Text>
                </VStack>
                <Button href="/properties" label={`View all ${properties.length}`} variant="secondary" icon={<ArrowRight size={16} />} />
              </HStack>
              {isSample && <Banner status="info" title="Design preview" description="Listings with an ASMS-PREVIEW reference are samples until verified inventory is added." />}
              <Carousel aria-label="Featured properties" gap={4} hasSnap>
                {featured.map((p, i) => <div key={p.slug} className="carousel-card"><PropertyCard property={p} priority={i < 3} /></div>)}
              </Carousel>
            </VStack>
          </div>
        </section>

        {/* 5. Construction products */}
        <section className="band band--tight" aria-labelledby="products-title">
          <div className="page">
            <VStack gap={5}>
              <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                <VStack gap={1}>
                  <Heading level={2} type="display-3" id="products-title">Construction products</Heading>
                  <Text color="secondary" as="p">Steel, roofing and concrete, described by grade and standard. Quotes per enquiry.</Text>
                </VStack>
                <Button href="/products" label="Browse the catalogue" variant="secondary" icon={<ArrowRight size={16} />} />
              </HStack>
              <Grid columns={{ minWidth: 260, repeat: "fit" }} gap={4}>
                {productCategories.map((c) => {
                  const photo = c.products.find((p) => p.image)?.image;
                  return (
                    <ClickableCard key={c.id} href={`/products?category=${c.id}`} label={`${c.name}: ${c.products.length} products`} padding={0}>
                      <div className="card-photo lc-photo">
                        <AspectRatio ratio={16 / 9}>
                          {photo
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={photo.srcSmall} alt="" loading="lazy" decoding="async" />
                            : <span className="photo-missing" aria-hidden="true" />}
                        </AspectRatio>
                      </div>
                      <VStack gap={1} padding={4}>
                        <Heading level={3}>{c.name}</Heading>
                        <Text type="supporting">{c.products.length} products</Text>
                      </VStack>
                    </ClickableCard>
                  );
                })}
              </Grid>
            </VStack>
          </div>
        </section>

        {/* 6. Why ASMS */}
        <ForestTheme>
          <section className="band band--forest" aria-labelledby="why-title">
            <div className="page">
              <VStack gap={8}>
                <VStack gap={2}>
                  <Heading level={2} type="display-3" id="why-title">Why buy through ASMS&#8209;ROUNAQH</Heading>
                  <Text type="large" color="secondary" as="p">No inflated claims and no artificial urgency, just details you can check.</Text>
                </VStack>
                <Grid columns={{ minWidth: 220, repeat: "fit" }} gap={6}>
                  {WHY.map(({ icon: Icon, title, text }) => (
                    <VStack key={title} gap={3}>
                      <span className="type-icon"><Icon size={24} aria-hidden="true" /></span>
                      <Heading level={3}>{title}</Heading>
                      <Text color="secondary" as="p">{text}</Text>
                    </VStack>
                  ))}
                </Grid>
              </VStack>
            </div>
          </section>
        </ForestTheme>

        {/* 7. Sell / source */}
        <section className="band band--tight" aria-label="Sell or source">
          <div className="page">
            <Grid columns={{ minWidth: 300, repeat: "fit" }} gap={4}>
              <Card padding={8} variant="muted">
                <VStack gap={3}>
                  <Heading level={2} type="display-3">Selling a property?</Heading>
                  <Text color="secondary" as="p">Homes, plots and commercial space, reviewed before buyers see them.</Text>
                  <div><Button href="/sell" label="List with us" variant="primary" /></div>
                </VStack>
              </Card>
              <Card padding={8} variant="muted">
                <VStack gap={3}>
                  <Heading level={2} type="display-3">Talk to the team</Heading>
                  <Text color="secondary" as="p">Call or WhatsApp <Link href={COMPANY.phoneHref}>{COMPANY.phone}</Link>, or write to <Link href={`mailto:${COMPANY.email}`}>{COMPANY.email}</Link>.</Text>
                  <HStack gap={2} wrap="wrap">
                    <Button href={COMPANY.phoneHref} label="Call now" variant="primary" icon={<Phone size={16} />} />
                    <Button href="/contact" label="Send an enquiry" />
                  </HStack>
                </VStack>
              </Card>
            </Grid>
          </div>
        </section>
      </main>
      <Footer credits={credits} />
    </>
  );
}
