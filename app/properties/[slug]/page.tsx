import { HERO_IMAGE, allProperties, getProperty, isSampleListing, priceLabel, pricePerSqFt, similarProperties, type PropertyRecord } from "@/lib/content";
import { categoryLabel, keySpecs, listingTag, shortDate } from "@/lib/property";
import { COMPANY } from "@/lib/company";
import { formatINR, monthlyEmi } from "@/lib/format";
import { amenityIcon, nearbyIcon } from "@/lib/presets";
import { Icon, type IconName } from "../../icons";
import { BRAND, Footer, Header, NotAvailablePage, PropertyCard } from "../../site-components";
import EmiCalculator from "./emi-calculator";
import { Gallery, PhotoGrid } from "./gallery";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Carousel } from "@astryxdesign/core/Carousel";
import { Divider } from "@astryxdesign/core/Divider";
import { FileText, Map as MapIcon, MapPin, Phone } from "lucide-react";
import { Link } from "@astryxdesign/core/Link";
import SectionTabs from "./section-tabs";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MobileActionBar, PropertyEnquiry, ShareButton, ViewTracker, WhatsAppButton } from "./property-actions";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

// A static export must build at least one page per route. With nothing published
// yet, a single placeholder is built and renders the not-found page.
export function generateStaticParams() {
  const params = allProperties.map((p) => ({ slug: p.slug }));
  return params.length ? params : [{ slug: "none" }];
}

export async function generateMetadata({ params }: { params: Params }) {
  const property = getProperty((await params).slug);
  if (!property) return { title: `Property not available | ${BRAND}`, robots: { index: false } };
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
  // Only the no-listings placeholder gets here (dynamicParams is false).
  if (!p) return <NotAvailablePage crumb="Properties" title="This property isn’t listed" lead="It may have been sold or taken down. Browse the current listings, or tell us what you are looking for." />;

  const sold = p.stage === "sold";
  const listing = { reference: p.reference, title: p.title };
  const tag = listingTag(p);
  const keyFacts = highlights(p);
  const details = overview(p);
  const perSqFt = pricePerSqFt(p);
  const emiFrom = p.price && !sold ? monthlyEmi(p.price * 0.8, 8.5, 20) : null;
  const nearbyGroups = [...new Set(p.nearby.map((n) => n.group))].map((group) => ({ group, places: p.nearby.filter((n) => n.group === group) }));
  const similar = similarProperties(p.slug);

  const sections = [
    ["overview", "Overview", true],
    ["amenities", "Amenities", p.amenities.length > 0],
    ["nearby", "Location", p.nearby.length > 0 || !!p.mapUrl],
    ["documents", "Documents", p.documents.length > 0],
    ["emi", "EMI calculator", !!p.price && !sold],
    ["photos", "Photos", p.images.length > 1],
  ] as const;

  const mapUrl = p.mapUrl?.startsWith("https://") ? p.mapUrl : null;

  return (
    <>
      <Header />
      <main id="main" className={sold ? undefined : "has-action-bar"}>
        {/* Title bar: breadcrumbs, title and place on the left; share and WhatsApp on the right. */}
        <section className="detail-head">
          <div className="page">
            <VStack gap={4}>
              <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
                <Breadcrumbs label="Breadcrumb">
                  <BreadcrumbItem href="/">Home</BreadcrumbItem>
                  <BreadcrumbItem href="/properties">Properties</BreadcrumbItem>
                  <BreadcrumbItem href={`/properties?type=${p.category}`}>{categoryLabel(p.category)}</BreadcrumbItem>
                  <BreadcrumbItem isCurrent>{p.reference}</BreadcrumbItem>
                </Breadcrumbs>
                {!sold && <HStack gap={2}><ShareButton listing={listing} /><WhatsAppButton listing={listing} /></HStack>}
              </HStack>
              <VStack gap={2}>
                <HStack gap={2} wrap="wrap" vAlign="center">
                  {tag && <Badge label={tag} variant={sold ? "neutral" : "warning"} />}
                  <Badge label={p.propertyType} variant="neutral" />
                  <Text type="supporting">Ref. {p.reference}{p.postedOn && <> · Listed <time dateTime={p.postedOn}>{shortDate(p.postedOn)}</time></>}</Text>
                </HStack>
                <Heading level={1} type="display-3" textWrap="balance">{p.title}</Heading>
                <HStack gap={1} vAlign="center" className="lc-muted">
                  <MapPin size={16} aria-hidden="true" />
                  <Text color="secondary">{[p.location, p.locality].filter(Boolean).join(", ")}</Text>
                  {mapUrl && <Text color="secondary"> · <Link href={mapUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</Link></Text>}
                </HStack>
              </VStack>
            </VStack>
          </div>
        </section>

        <div className="page">
          <VStack gap={5}>
            {p.images.length > 0 && <Gallery photos={p.images} title={p.title} />}
            {isSampleListing(p) && <Banner status="info" title="Design preview" description="Every figure, amenity, distance and photograph on this page is sample data until verified property information is supplied." />}
          </VStack>
        </div>

        <section className="band band--tight">
          <div className="page detail-grid">
            <VStack gap={8}>
              {keyFacts.length > 0 && (
                <Card padding={0}>
                  <ul className="facts-strip" aria-label="Key highlights">
                    {keyFacts.map((item) => (
                      <li key={item.label}>
                        <span className="icon-line"><Icon name={item.icon} /></span>
                        <span><Text type="supporting" display="block">{item.label}</Text><Text weight="bold">{item.value}</Text></span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <nav className="section-tabs" aria-label="Property sections">
                <SectionTabs sections={sections.filter(([, , show]) => show).map(([id, label]) => ({ id, label }))} />
              </nav>

              <section id="overview" aria-labelledby="overview-title">
                <VStack gap={4}>
                  <Heading level={2} id="overview-title">About this property</Heading>
                  {p.description && <div className="prose measure">{p.description.split(/\n{2,}/).map((para, i) => <Text key={i} as="p" display="block">{para}</Text>)}</div>}
                  {details.length > 0 && (
                    <VStack gap={3}>
                      <Heading level={3}>Property details</Heading>
                      <dl className="detail-table">
                        {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                      </dl>
                    </VStack>
                  )}
                </VStack>
              </section>

              {p.amenities.length > 0 && (
                <section id="amenities" aria-labelledby="amenities-title">
                  <VStack gap={4}>
                    <Heading level={2} id="amenities-title">Amenities &amp; infrastructure</Heading>
                    <ul className="amenity-list">
                      {p.amenities.map((label) => <li key={label}><span className="icon-line"><Icon name={amenityIcon(label)} /></span>{label}</li>)}
                    </ul>
                  </VStack>
                </section>
              )}

              {(nearbyGroups.length > 0 || mapUrl) && (
                <section id="nearby" aria-labelledby="nearby-title">
                  <VStack gap={4}>
                    <Heading level={2} id="nearby-title">Location and what&apos;s nearby</Heading>
                    <Card variant="muted" padding={5}>
                      <HStack gap={4} vAlign="center" hAlign="between" wrap="wrap">
                        <HStack gap={3} vAlign="center">
                          <span className="type-icon"><MapPin size={22} aria-hidden="true" /></span>
                          <VStack gap={0}><Text weight="bold">{p.location}</Text>{p.locality && <Text type="supporting">{p.locality}</Text>}</VStack>
                        </HStack>
                        {mapUrl && <Button href={mapUrl} target="_blank" rel="noopener noreferrer" label="Open in Google Maps" icon={<MapIcon size={16} />} />}
                      </HStack>
                    </Card>
                    {nearbyGroups.length > 0 && (
                      <Grid columns={{ minWidth: 240, repeat: "fit" }} gap={5}>
                        {nearbyGroups.map(({ group, places }) => (
                          <VStack key={group} gap={2}>
                            <HStack gap={2} vAlign="center"><span className="icon-line"><Icon name={nearbyIcon(group)} /></span><Heading level={3}>{group}</Heading></HStack>
                            <dl className="detail-table detail-table--one">
                              {places.map((place) => <div key={place.name}><dt>{place.name}</dt><dd>{place.distance}</dd></div>)}
                            </dl>
                          </VStack>
                        ))}
                      </Grid>
                    )}
                  </VStack>
                </section>
              )}

              {p.documents.length > 0 && (
                <section id="documents" aria-labelledby="documents-title">
                  <VStack gap={4}>
                    <Heading level={2} id="documents-title">Documents and approvals</Heading>
                    <Text color="secondary" as="p" className="measure">Available documents are listed by type and verification status. Buyers should arrange an independent legal review before purchase.</Text>
                    <ul className="doc-list">
                      {p.documents.map((d) => (
                        <li key={d.label}>
                          <HStack gap={3} vAlign="center"><FileText size={18} aria-hidden="true" /><Text weight="semibold">{d.label}</Text></HStack>
                          <Badge label={d.status} variant={/verified|available|approved/i.test(d.status) && !/to be/i.test(d.status) ? "success" : "warning"} />
                        </li>
                      ))}
                    </ul>
                  </VStack>
                </section>
              )}

              {p.images.length > 1 && (
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

            {/* Sticky sidebar: price summary and the enquiry form in one card. */}
            <aside className="detail-rail" id="enquire" aria-labelledby="enquire-title">
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
                      <Text type="supporting">Asking price</Text>
                      <Heading level={2} id="enquire-title" type="display-3"><span className="num">{priceLabel(p)}</span></Heading>
                      {p.price && <Text type="supporting" hasTabularNumbers>{formatINR(p.price)}{perSqFt && ` · ${perSqFt}/sq ft`}</Text>}
                      {emiFrom && <Link href="#emi">EMI from {formatINR(emiFrom)} a month</Link>}
                      {p.priceNegotiable && <div><Badge label="Price negotiable" variant="success" /></div>}
                    </VStack>
                    <Divider />
                    <PropertyEnquiry listing={listing} />
                    <Divider />
                    <HStack gap={2} vAlign="center">
                      <Phone size={16} aria-hidden="true" />
                      <Text type="supporting">Prefer to call? <Link href={COMPANY.phoneHref}>{COMPANY.phone}</Link></Text>
                    </HStack>
                  </VStack>
                )}
              </Card>
            </aside>
          </div>
        </section>

        {similar.length > 0 && (
          <section className="band band--tight band--muted" id="similar" aria-labelledby="similar-title">
            <div className="page">
              <VStack gap={5}>
                <HStack gap={4} hAlign="between" vAlign="end" wrap="wrap">
                  <Heading level={2} type="display-3" id="similar-title">Similar properties</Heading>
                  <Button href="/properties" label="View all properties" variant="secondary" />
                </HStack>
                <Carousel aria-label="Similar properties" gap={4} hasSnap>
                  {similar.map((property) => <div key={property.slug} className="carousel-card"><PropertyCard property={property} /></div>)}
                </Carousel>
              </VStack>
            </div>
          </section>
        )}
      </main>
      {!sold && <><ViewTracker reference={p.reference} /><MobileActionBar listing={listing} /></>}
      <Footer />
    </>
  );
}
