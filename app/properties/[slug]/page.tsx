import { notFound } from "next/navigation";
import { getProperty, isSample, priceLabel, pricePerSqFt, properties, similarProperties, type PropertyRecord } from "@/lib/content";
import { formatINR, monthlyEmi } from "@/lib/format";
import { amenityIcon, nearbyIcon } from "@/lib/presets";
import { Icon, type IconName } from "../../icons";
import { BRAND, Footer, Header, PropertyCard } from "../../site-components";
import EmiCalculator from "./emi-calculator";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const property = getProperty((await params).slug);
  if (!property) return {};
  return {
    title: `${property.title} | ${BRAND}`,
    description: `${property.propertyType} in ${property.location}, ${priceLabel(property)}.`,
  };
}

const yesNo = (value: boolean | null) => (value === null ? null : value ? "Yes" : "No");

function highlights(p: PropertyRecord): { icon: IconName; label: string; value: string }[] {
  const items: [IconName, string, string | null][] = [
    ["area", "Plot area", p.areaSqFt ? `${p.areaSqFt.toLocaleString("en-IN")} sq ft` : null],
    ["ruler", "Dimensions", p.dimensions],
    ["compass", "Facing", p.facing],
    ["road", "Road width", p.roadWidth],
    ["shield", "Approval", p.approval],
    ["key", "Ownership", p.ownership],
  ];
  return items.filter((i): i is [IconName, string, string] => !!i[2]).map(([icon, label, value]) => ({ icon, label, value }));
}

function overview(p: PropertyRecord): [string, string][] {
  const rows: [string, string | null][] = [
    ["Property type", p.propertyType],
    ["Transaction type", p.transactionType],
    ["Ownership", p.ownership],
    ["Approval authority", p.approval],
    ["RERA registration", p.rera],
    ["Area", p.areaSqFt ? `${p.areaSqFt.toLocaleString("en-IN")} sq ft (approx. ${(p.areaSqFt / 435.6).toFixed(2)} cents)` : null],
    ["Dimensions", p.dimensions],
    ["Facing", p.facing],
    ["Width of facing road", p.roadWidth],
    ["Corner plot", yesNo(p.cornerPlot)],
    ["Boundary wall", yesNo(p.boundaryWall)],
    ["Gated layout", yesNo(p.gatedLayout)],
    ["Floors allowed for construction", p.floorsAllowed],
    ["Availability", p.availability],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

export default async function PropertyDetailPage({ params }: { params: Params }) {
  const p = getProperty((await params).slug);
  if (!p) notFound();

  const keyFacts = highlights(p);
  const details = overview(p);
  const perSqFt = pricePerSqFt(p);
  const emiFrom = p.price ? monthlyEmi(p.price * 0.8, 8.5, 20) : null;
  const nearbyGroups = [...new Set(p.nearby.map((n) => n.group))].map((group) => ({ group, places: p.nearby.filter((n) => n.group === group) }));
  const similar = similarProperties(p.slug);
  const gallery = p.images.slice(0, 3);

  const sections = [
    ["overview", "Overview", true],
    ["amenities", "Amenities", p.amenities.length > 0],
    ["nearby", "Nearby", p.nearby.length > 0],
    ["documents", "Documents", p.documents.length > 0],
    ["emi", "EMI calculator", !!p.price],
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
            <div className="detail-kicker"><span className="tag">{p.statusLabel}</span><span>Ref. {p.reference}</span>{p.postedOn && <span>Posted <time dateTime={p.postedOn}>{new Date(p.postedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</time></span>}</div>
            <h1>{p.title}</h1>
            <p>{[p.location, p.locality].filter(Boolean).join(", ")}</p>
          </div>
          <div className="detail-price">
            <small>Asking price</small>
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
              <img src={index === 0 ? image.src : image.srcSmall} alt={image.alt || p.title} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
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

          {p.price && (
            <section className="detail-section" id="emi">
              <h2>Estimate your EMI</h2>
              <EmiCalculator price={p.price} />
            </section>
          )}
        </div>

        <aside className="detail-enquiry-card on-field" aria-labelledby="enquire-title">
          <h2 id="enquire-title">{priceLabel(p)}</h2>
          <p>Quote reference <strong>{p.reference}</strong> when you contact the team.</p>
          <a className="btn" href={`/contact?interest=${encodeURIComponent(p.reference)}`}>Enquire about property</a>
          <a className="btn btn--quiet" href={`/contact?interest=${encodeURIComponent(`${p.reference} site visit`)}`}>Request a site visit</a>
          <p className="detail-card-note"><strong>Before you enquire.</strong> Prepare your preferred location, intended use, budget range and timeline.</p>
        </aside>
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
      <Footer />
    </>
  );
}
