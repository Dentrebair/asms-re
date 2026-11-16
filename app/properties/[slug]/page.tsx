import { notFound } from "next/navigation";
import { HERO_IMAGE, allProperties, getProperty, isSample, priceLabel, pricePerSqFt, similarProperties, type PropertyRecord } from "@/lib/content";
import { keySpecs, listingTag, shortDate } from "@/lib/property";
import { formatINR, monthlyEmi } from "@/lib/format";
import { amenityIcon, nearbyIcon } from "@/lib/presets";
import { Icon, type IconName } from "../../icons";
import { BRAND, Footer, Header, PropertyCard } from "../../site-components";
import EmiCalculator from "./emi-calculator";
import { Gallery, PhotoGrid } from "./gallery";
import { ForestTheme } from "../../astryx/themes";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import SectionTabs from "./section-tabs";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MobileActionBar, PropertyEnquiry, ShareButton, ViewTracker, WhatsAppButton } from "./property-actions";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return allProperties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const property = getProperty((await params).slug);
  if (!property) return {};
  const description = `${property.propertyType} in ${property.location}, ${priceLabel(property)}${property.stage === "sold" ? ", sold" : ""}.`;
  return {
    title: `${property.title} | ${BRAND}`,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: property.title,
      description,
      url: `/properties/${property.slug}`,
      // No photos yet: share with the site's main photo rather than no preview at all.
      images: [property.images[0] ? { url: property.images[0].src, alt: property.images[0].alt || property.title } : { url: HERO_IMAGE, alt: BRAND }],
    },
  };
}

const SPEC_ICONS: Record<string, IconName> = {
  "Plot area": "area", "Built-up area": "area", "Total area": "area", "Carpet area": "area", "Usable area": "area",
  Dimensions: "ruler", Frontage: "ruler", Facing: "compass", "Road width": "road", Access: "road",
  Bedrooms: "key", Bathrooms: "water", Parking: "roof", Possession: "key", Type: "layers", "Land use": "tree",
};

/** The first six type-specific facts, as the icon strip under the gallery. */
function highlights(p: PropertyRecord): { icon: IconName; label: string; value: string }[] {
  return keySpecs(p).slice(0, 6).map(([label, value]) => ({ icon: SPEC_ICONS[label] ?? "shield", label, value }));
}

/** Everything else a buyer checks: type-specific facts, then legal and listing facts. */
function overview(p: PropertyRecord): [string, string][] {
  const rows: [string, string | null][] = [
    ["Property type", p.propertyType],
    ...keySpecs(p),
    ["Transaction type", p.transactionType],
    ["Ownership", p.ownership],
    ["Approval authority", p.approval],
    ["RERA registration", p.rera],
    ["Availability", p.availability],
    ["Price negotiable", p.priceNegotiable === null ? null : p.priceNegotiable ? "Yes" : "No"],
    ["Details last confirmed", p.lastConfirmedOn ? shortDate(p.lastConfirmedOn) : null],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default async function PropertyDetailPage({ params }: { params: Params }) {
  const p = getProperty((await params).slug);
  if (!p) notFound();

  const sold = p.stage === "sold";
  const listing = { reference: p.reference, title: p.title };
  const tag = listingTag(p);
  const keyFacts = highlights(p);
  const details = overview(p);
  const perSqFt = pricePerSqFt(p);
  const emiFrom = p.price && !sold ? monthlyEmi(p.price * 0.8, 8.5, 20) : null;
  const nearbyGroups = [...new Set(p.nearby.map((n) => n.group))].map((group) => ({ group, places: p.nearby.filter((n) => n.group === group) }));
  const similar = similarProperties(p.slug);
  const gallery = p.images.slice(0, 3);

  const sections = [
    ["overview", "Overview", true],
    ["amenities", "Amenities", p.amenities.length > 0],
    ["nearby", "Nearby", p.nearby.length > 0],
    ["documents", "Documents", p.documents.length > 0],
    ["emi", "EMI calculator", !!p.price && !sold],
    ["similar", "Similar properties", similar.length > 0],
  ] as const;

  return (
    <>
      <Header />
      <main id="main" className={sold ? undefined : "has-action-bar"}>
        <section className="band band--tight" style={{ paddingBottom: "var(--spacing-6)" }}>
          <div className="page">
            <VStack gap={5}>
              <Breadcrumbs label="Breadcrumb">
                <BreadcrumbItem href="/">Home</BreadcrumbItem>
                <BreadcrumbItem href="/properties">Properties</BreadcrumbItem>
                <BreadcrumbItem isCurrent>{p.reference}</BreadcrumbItem>
              </Breadcrumbs>
              <HStack gap={6} hAlign="between" vAlign="end" wrap="wrap">
                <VStack gap={3} className="measure">
                  <HStack gap={2} wrap="wrap" vAlign="center">
                    {tag && <Badge label={tag} variant={sold ? "neutral" : "warning"} />}
                    <Text type="supporting">Ref. {p.reference}</Text>
                    {p.postedOn && <Text type="supporting">· Listed <time dateTime={p.postedOn}>{shortDate(p.postedOn)}</time></Text>}
                    {p.lastConfirmedOn && <Text type="supporting">· Details confirmed <time dateTime={p.lastConfirmedOn}>{shortDate(p.lastConfirmedOn)}</time></Text>}
                  </HStack>
                  <Heading level={1} type="display-2" textWrap="balance">{p.title}</Heading>
                  <Text type="large" color="secondary" as="p">
                    {[p.location, p.locality].filter(Boolean).join(", ")}
                    {p.mapUrl?.startsWith("https://") && <> · <Link href={p.mapUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</Link></>}
                  </Text>
                </VStack>
                <VStack gap={1} className="detail-price">
                  <Text type="supporting">{sold ? "Sold" : "Asking price"}</Text>
                  <Heading level={2} type="display-3"><span className="num">{priceLabel(p)}</span></Heading>
                  {p.price && <Text type="supporting" hasTabularNumbers>{formatINR(p.price)}</Text>}
                  {perSqFt && <Text type="supporting" hasTabularNumbers>{perSqFt} per sq ft</Text>}
                  {emiFrom && <Link href="#emi">EMI from {formatINR(emiFrom)} a month</Link>}
                </VStack>
              </HStack>
            </VStack>
          </div>
        </section>

        <div className="page">
          <VStack gap={6}>
            {gallery.length > 0 && <Gallery photos={p.images} title={p.title} />}

            {keyFacts.length > 0 && (
              <section aria-label="Key highlights">
                <Grid columns={{ minWidth: 160, repeat: "fit" }} gap={3}>
                  {keyFacts.map((item) => (
                    <Card key={item.label} variant="muted" padding={4}>
                      <VStack gap={2}>
                        <span className="icon-line"><Icon name={item.icon} /></span>
                        <Text type="supporting">{item.label}</Text>
                        <Text weight="bold">{item.value}</Text>
                      </VStack>
                    </Card>
                  ))}
                </Grid>
              </section>
            )}

            {isSample && <Banner status="info" title="Design preview" description="Every figure, amenity, distance and photograph on this page is sample data until verified property information is supplied." />}
          </VStack>
        </div>

        <nav className="section-tabs" aria-label="Property sections">
          <div className="page">
            <SectionTabs sections={sections.filter(([, , show]) => show).map(([id, label]) => ({ id, label }))} />
          </div>
        </nav>

        <section className="band band--tight">
          <div className="page detail-grid">
            <VStack gap={10}>
              <section id="overview" aria-labelledby="overview-title">
                <VStack gap={4}>
                  <Heading level={2} id="overview-title">About this property</Heading>
                  {p.description && <div className="prose measure">{p.description.split(/\n{2,}/).map((para, i) => <Text key={i} as="p">{para}</Text>)}</div>}
                  {details.length > 0 && (
                    <Card padding={5}>
                      <MetadataList title="More details" columns="multi">
                        {details.map(([label, value]) => <MetadataListItem key={label} label={label}>{value}</MetadataListItem>)}
                      </MetadataList>
                    </Card>
                  )}
                </VStack>
              </section>

              {p.amenities.length > 0 && (
                <section id="amenities" aria-labelledby="amenities-title">
                  <VStack gap={4}>
                    <Heading level={2} id="amenities-title">Amenities &amp; infrastructure</Heading>
                    <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3}>
                      {p.amenities.map((label) => (
                        <Card key={label} padding={4}>
                          <HStack gap={3} vAlign="center"><span className="icon-line"><Icon name={amenityIcon(label)} /></span><Text>{label}</Text></HStack>
                        </Card>
                      ))}
                    </Grid>
                  </VStack>
                </section>
              )}

              {nearbyGroups.length > 0 && (
                <section id="nearby" aria-labelledby="nearby-title">
                  <VStack gap={4}>
                    <Heading level={2} id="nearby-title">What&apos;s nearby</Heading>
                    <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={3}>
                      {nearbyGroups.map(({ group, places }) => (
                        <Card key={group} padding={5}>
                          <VStack gap={3}>
                            <HStack gap={2} vAlign="center"><span className="icon-line"><Icon name={nearbyIcon(group)} /></span><Heading level={3}>{group}</Heading></HStack>
                            <MetadataList orientation="horizontal">
                              {places.map((place) => <MetadataListItem key={place.name} label={place.name}>{place.distance}</MetadataListItem>)}
                            </MetadataList>
                          </VStack>
                        </Card>
                      ))}
                    </Grid>
                  </VStack>
                </section>
              )}

              {p.documents.length > 0 && (
                <section id="documents" aria-labelledby="documents-title">
                  <VStack gap={4}>
                    <Heading level={2} id="documents-title">Documents and approvals</Heading>
                    <Text color="secondary" as="p" className="measure">Available documents are listed by type and verification status. Buyers should arrange an independent legal review before purchase.</Text>
                    <Card padding={5}>
                      <MetadataList>
                        {p.documents.map((d) => <MetadataListItem key={d.label} label={d.label}>{d.status}</MetadataListItem>)}
                      </MetadataList>
                    </Card>
                  </VStack>
                </section>
              )}

              {p.images.length > 3 && (
                <section id="photos" aria-labelledby="photos-title">
                  <VStack gap={4}>
                    <Heading level={2} id="photos-title">All photos</Heading>
                    <PhotoGrid photos={p.images} title={p.title} />
                  </VStack>
                </section>
              )}

              {p.price && !sold && (
                <section id="emi" aria-labelledby="emi-title">
                  <VStack gap={4}>
                    <Heading level={2} id="emi-title">Estimate your EMI</Heading>
                    <EmiCalculator price={p.price} />
                  </VStack>
                </section>
              )}
            </VStack>

            <aside className="detail-rail" id="enquire" aria-labelledby="enquire-title">
              <ForestTheme>
                <Card padding={6} elevation="med">
                  {sold ? (
                    <VStack gap={4}>
                      <Heading level={2} id="enquire-title">This property has been sold</Heading>
                      <Text color="secondary" as="p">It is no longer available, so we are not taking enquiries for it. Similar properties are listed below.</Text>
                      <Button href="/properties" label="See available properties" variant="primary" />
                    </VStack>
                  ) : (
                    <VStack gap={5}>
                      <VStack gap={1}>
                        <Heading level={2} id="enquire-title"><span className="num">{priceLabel(p)}</span></Heading>
                        <Text color="secondary">Ref. <strong>{p.reference}</strong>{p.priceNegotiable ? ", price negotiable" : ""}</Text>
                      </VStack>
                      <PropertyEnquiry listing={listing} />
                      <HStack gap={2} wrap="wrap">
                        <WhatsAppButton listing={listing} />
                        <ShareButton listing={listing} />
                      </HStack>
                    </VStack>
                  )}
                </Card>
              </ForestTheme>
            </aside>
          </div>
        </section>

        {similar.length > 0 && (
          <section className="band band--tight" id="similar" aria-labelledby="similar-title">
            <div className="page">
              <VStack gap={6}>
                <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                  <Heading level={2} type="display-3" id="similar-title">Similar properties</Heading>
                  <Button href="/properties" label="View all properties" variant="secondary" />
                </HStack>
                <ul className="card-grid">{similar.map((property) => <li key={property.slug}><PropertyCard property={property} /></li>)}</ul>
              </VStack>
            </div>
          </section>
        )}

        <ForestTheme>
          <section className="band band--forest" aria-labelledby="compare-title">
            <div className="page">
              <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
                <Heading level={2} type="display-3" id="compare-title">Compare other property opportunities</Heading>
                <Button href="/properties" label="View all properties" variant="primary" size="lg" />
              </HStack>
            </div>
          </section>
        </ForestTheme>
      </main>
      {!sold && <><ViewTracker reference={p.reference} /><MobileActionBar listing={listing} /></>}
      <Footer />
    </>
  );
}
