import { notFound } from "next/navigation";
import { allProperties, getProperty, isSample, priceLabel, pricePerSqFt, similarProperties, type PropertyRecord } from "@/lib/content";
import { keySpecs, listingTag, shortDate } from "@/lib/property";
import { formatINR, monthlyEmi } from "@/lib/format";
import { amenityIcon, nearbyIcon } from "@/lib/presets";
import { Icon, type IconName } from "../../icons";
import { BRAND, Footer, Header, PropertyCard } from "../../site-components";
import EmiCalculator from "./emi-calculator";
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
      images: property.images[0] ? [{ url: property.images[0].src, alt: property.images[0].alt || property.title }] : undefined,
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
      <main id="main" className="property-detail-page">
      <section className="detail-top container">
        <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/properties">Properties</a><span>/</span><b>{p.reference}</b></nav>
        <div className="detail-heading">
          <div>
            <div className="detail-kicker">{tag && <span className="tag">{tag}</span>}<span>Ref. {p.reference}</span>{p.postedOn && <span>Listed <time dateTime={p.postedOn}>{shortDate(p.postedOn)}</time></span>}{p.lastConfirmedOn && <span>Details confirmed <time dateTime={p.lastConfirmedOn}>{shortDate(p.lastConfirmedOn)}</time></span>}</div>
            <h1>{p.title}</h1>
            <p>
              {[p.location, p.locality].filter(Boolean).join(", ")}
              {p.mapUrl?.startsWith("https://") && <> · <a className="link" href={p.mapUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></>}
            </p>
          </div>
          <div className="detail-price">
            <small>{sold ? "Sold" : "Asking price"}</small>
            <strong>{priceLabel(p)}</strong>
            {p.price && <small className="num">{formatINR(p.price)}</small>}
            {perSqFt && <small className="num">{perSqFt} per sq ft</small>}
            {emiFrom && <a className="link" href="#emi">EMI from {formatINR(emiFrom)} a month</a>}
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className={`detail-gallery container gallery-count-${gallery.length}`} aria-label="Property gallery">
          {gallery.map((image, index) => (
            <figure key={image.src} className={index === 0 ? "gallery-main" : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={index === 0 ? image.src : image.srcSmall} alt={image.alt || p.title} {...(index === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const, decoding: "async" as const })} />
                          </figure>
          ))}
          {p.images.length > 3 && <a className="btn btn--quiet btn--small gallery-more" href="#photos">View all {p.images.length} photos</a>}
        </section>
      )}

      {keyFacts.length > 0 && (
        <section className="container" aria-label="Key highlights"><div className="key-highlights">
          {keyFacts.map((item) => <div key={item.label}><Icon name={item.icon} /><small>{item.label}</small><strong>{item.value}</strong></div>)}
        </div></section>
      )}

      {isSample && <p className="container notice detail-notice">Design preview: every figure, amenity, distance and photograph on this page is sample data until verified property information is supplied.</p>}

      <nav className="detail-tabs" aria-label="Property sections">
        <div className="container">{sections.filter(([, , show]) => show).map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>
      </nav>

      <section className="detail-layout container">
        <div className="detail-content">
          <section id="overview">
            <h2>About this property</h2>
            {p.description && p.description.split(/\n{2,}/).map((para, i) => <p key={i} className="detail-lead">{para}</p>)}
            {details.length > 0 && (
              <>
                <h3 className="detail-subhead">More details</h3>
                <dl className="spec-table">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              </>
            )}
          </section>

          {p.amenities.length > 0 && (
            <section className="detail-section" id="amenities">
              <h2>Amenities &amp; infrastructure</h2>
              <ul className="amenity-grid">{p.amenities.map((label) => <li key={label}><Icon name={amenityIcon(label)} /><span>{label}</span></li>)}</ul>
            </section>
          )}

          {nearbyGroups.length > 0 && (
            <section className="detail-section" id="nearby">
              <h2>What’s nearby</h2>
              <div className="nearby-grid">
                {nearbyGroups.map(({ group, places }) => (
                  <article key={group}>
                    <h3><Icon name={nearbyIcon(group)} />{group}</h3>
                    <ul>{places.map((place) => <li key={place.name}><span>{place.name}</span><strong>{place.distance}</strong></li>)}</ul>
                  </article>
                ))}
              </div>
            </section>
          )}

          {p.documents.length > 0 && (
            <section className="detail-section documents-section" id="documents">
              <h2>Documents and approvals</h2>
              <p>Available documents are listed by type and verification status. Buyers should arrange an independent legal review before purchase.</p>
              <div className="document-table">{p.documents.map((d) => <div key={d.label}><span>{d.label}</span><strong>{d.status}</strong></div>)}</div>
            </section>
          )}

          {p.images.length > 3 && (
            <section className="detail-section" id="photos">
              <h2>All photos</h2>
              <div className="photo-grid">
                {p.images.map((image) => (
                  <a key={image.src} href={image.src} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.srcSmall} alt={image.alt || p.title} loading="lazy" decoding="async" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {p.price && !sold && (
            <section className="detail-section" id="emi">
              <h2>Estimate your EMI</h2>
              <EmiCalculator price={p.price} />
            </section>
          )}
        </div>

        {sold ? (
        <aside className="detail-enquiry-card on-field" aria-labelledby="enquire-title">
          <h2 id="enquire-title">This property has been sold</h2>
          <p>It is no longer available, so we are not taking enquiries for it. Similar properties are listed below.</p>
          <a className="btn" href="/properties">See available properties</a>
        </aside>
        ) : (
        <aside id="enquire" className="detail-enquiry-card on-field" aria-labelledby="enquire-title">
          <h2 id="enquire-title">{priceLabel(p)}</h2>
          <p>Ref. <strong>{p.reference}</strong>{p.priceNegotiable ? ", price negotiable" : ""}</p>
          <PropertyEnquiry listing={listing} />
          <div className="rail-secondary">
            <WhatsAppButton listing={listing} />
            <ShareButton listing={listing} />
          </div>
        </aside>
        )}
      </section>

      {similar.length > 0 && (
        <section className="container similar-section" id="similar" aria-labelledby="similar-title">
          <div className="head-split">
            <h2 id="similar-title">Similar properties</h2>
            <div><a className="link" href="/properties">View all properties</a></div>
          </div>
          <ul className="card-grid">{similar.map((property) => <li key={property.slug}><PropertyCard property={property} /></li>)}</ul>
        </section>
      )}

      <section className="band on-field" aria-labelledby="compare-title">
        <div className="container close-plain">
          <div><h2 id="compare-title">Compare other property opportunities</h2></div>
          <div className="actions"><a className="btn btn--quiet" href="/properties">View all properties</a></div>
        </div>
      </section>
      </main>
      {!sold && <><ViewTracker reference={p.reference} /><MobileActionBar listing={listing} /></>}
      <Footer />
    </>
  );
}
