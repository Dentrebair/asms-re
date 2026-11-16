import { Heading, Text } from "@astryxdesign/core/Text";
import { Link } from "@astryxdesign/core/Link";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { areaLabel, priceLabel, type ProductRecord, type PropertyRecord } from "@/lib/content";
import { COMPANY } from "@/lib/company";
import { listingTag, shortDate } from "@/lib/property";
import { ForestTheme } from "./astryx/themes";
import { ListingCard, type ListingCardData } from "./listing-card";
import SiteHeader from "./site-header";

/** The brand name. A non-breaking hyphen joins the two words. */
export const BRAND = "ASMS‑ROUNAQH";

export function Header() {
  return <SiteHeader brand={BRAND} />;
}

/** Card data for a property, in the shared listing skeleton. */
export function propertyCardData(p: PropertyRecord): ListingCardData {
  return {
    href: `/properties/${p.slug}`,
    title: p.title,
    image: p.images[0] ? { src: p.images[0].srcSmall, alt: p.images[0].alt } : null,
    tag: listingTag(p),
    facts: [
      { label: "Location", value: p.location },
      { label: "Type", value: p.propertyType },
      { label: "Area", value: areaLabel(p) },
    ],
    value: priceLabel(p),
    meta: p.postedOn ? `Listed ${shortDate(p.postedOn)}` : `Ref. ${p.reference}`,
  };
}

/** Card data for a product, in the same skeleton: the card opens the product page with its quote form. */
export function productCardData(p: ProductRecord, categoryName?: string): ListingCardData {
  return {
    href: `/products/${p.slug}`,
    title: p.name,
    image: p.image ? { src: p.image.srcSmall, alt: p.image.alt } : null,
    tag: categoryName,
    summary: p.summary,
    facts: p.specs.slice(0, 3),
    value: "Quote on request",
    meta: p.unit || null,
  };
}

export function ListingCardFor({ product, categoryName }: { product: ProductRecord; categoryName?: string }) {
  return <ListingCard card={productCardData(product, categoryName)} />;
}

export function PropertyCard({ property, priority = false }: { property: PropertyRecord; priority?: boolean }) {
  return <ListingCard card={propertyCardData(property)} priority={priority} />;
}

export type Credit = { label: string; artist: string; license: string; licenseUrl: string; source: string };

const FOOTER_LINKS = [
  { href: "/properties", label: "Properties" },
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Send an enquiry" },
  { href: "/sell", label: "Sell a property" },
  { href: "/privacy", label: "Privacy notice" },
  { href: "/terms", label: "Terms of use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export function Footer({ credits = [] }: { credits?: Credit[] }) {
  return (
    <ForestTheme>
      <footer className="site-footer band band--forest">
        <div className="page">
          <VStack gap={8}>
            <Grid columns={{ minWidth: 280, repeat: "fit" }} gap={8}>
              <VStack gap={4}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser */}
                <img className="footer-logo" src="/brand/logo-full-light.webp" alt={`${BRAND}, construction firm. Real expertise, real estates, real buildings. Legacy since ${COMPANY.since}.`} width={487} height={320} loading="lazy" />
                <Text type="large" as="p">If a listing or a product fits what you are planning, write to us with its reference. We reply with the verified details.</Text>
              </VStack>
              <VStack gap={3} className="footer-contact">
                <Heading level={2} type="display-3">Visit or call</Heading>
                <Link href={COMPANY.phoneHref} isStandalone>{COMPANY.phone}</Link>
                <Link href={`mailto:${COMPANY.email}`} isStandalone>{COMPANY.email}</Link>
                <Text color="secondary" as="p">{COMPANY.address.join(", ")}</Text>
              </VStack>
            </Grid>
            <nav aria-label="Footer">
              <HStack gap={5} wrap="wrap">
                {FOOTER_LINKS.map((l) => <Link key={l.href} href={l.href} isStandalone>{l.label}</Link>)}
                <Link href="/admin" rel="nofollow" isStandalone color="secondary">Staff login</Link>
              </HStack>
            </nav>
            <Divider />
            <VStack gap={2}>
              <Text type="supporting" as="p">© {BRAND}. Continuing a legacy since {COMPANY.since}. Chennai, Tamil Nadu.</Text>
              {credits.length > 0 && (
                <Text type="supporting" as="p" data-credits>
                  Photographs: {credits.map((c, i) => (
                    <span key={c.source}>
                      {i > 0 && "; "}
                      {c.label}, <a href={c.source} target="_blank" rel="noopener noreferrer">{c.artist}</a>
                      {c.licenseUrl ? <>, <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a></> : `, ${c.license}`}
                    </span>
                  ))}
                </Text>
              )}
            </VStack>
          </VStack>
        </div>
      </footer>
    </ForestTheme>
  );
}

/** Credits for library photos shown on a page (the user's own uploads carry none). */
export function creditsFor(items: { name: string; image: { credit?: Omit<Credit, "label"> | null } | null }[]): Credit[] {
  return items.flatMap((item) => (item.image?.credit ? [{ label: item.name, ...item.image.credit }] : []));
}

/** A page heading block: title, a lead line, and optional actions. */
export function PageHead({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <section className="band band--tight" aria-labelledby="page-title">
      <div className="page">
        <VStack gap={4}>
          <Heading level={1} type="display-2" id="page-title" textWrap="balance">{title}</Heading>
          {lead && <Text type="large" color="secondary" as="p" textWrap="pretty">{lead}</Text>}
          {children}
        </VStack>
      </div>
    </section>
  );
}
