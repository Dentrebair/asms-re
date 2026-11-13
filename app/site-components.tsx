import { areaLabel, priceLabel, type ProductRecord, type PropertyRecord } from "@/lib/content";
import { listingTag, shortDate } from "@/lib/property";
import { ListingCard, type ListingCardData } from "./listing-card";

/** The brand name. A non-breaking hyphen joins the two words (Hallmark gate 19 bars dashes in copy). */
export const BRAND = "ASMS‑ROUNAQH";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/products", label: "Products" },
  { href: "/#divisions", label: "Services" },
  { href: "/#why-us", label: "About" },
];

function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label={`${BRAND} home`}>
      <span className="wordmark-mark" aria-hidden="true">AR</span>
      <span className="wordmark-name">{BRAND}</span>
    </a>
  );
}

export function Header() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav">
        <div className="container">
          <div className="nav-pill">
            <Wordmark />
            <nav className="nav-links" aria-label="Primary">
              {NAV_LINKS.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
            </nav>
            <a className="btn btn--small" href="/contact">Enquire</a>
            <details className="nav-menu">
              <summary aria-label="Open menu"><span aria-hidden="true" /><span aria-hidden="true" /></summary>
              <nav aria-label="Menu">
                {NAV_LINKS.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
                <a href="/contact">Contact</a>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
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

/** Card data for a product, in the same skeleton: the card links to a quote request. */
export function productCardData(p: ProductRecord, categoryName?: string): ListingCardData {
  return {
    href: `/contact?category=${encodeURIComponent("Construction products")}&interest=${encodeURIComponent(p.name)}`,
    title: p.name,
    image: p.image ? { src: p.image.srcSmall, alt: p.image.alt } : null,
    tag: categoryName,
    summary: p.summary,
    facts: p.specs.slice(0, 3),
    value: "Quote on request",
    meta: p.unit || null,
    ariaLabel: `Request a quote for ${p.name}`,
  };
}

export function ListingCardFor({ product, categoryName }: { product: ProductRecord; categoryName?: string }) {
  return <ListingCard card={productCardData(product, categoryName)} />;
}

export function PropertyCard({ property, priority = false }: { property: PropertyRecord; priority?: boolean }) {
  return <ListingCard card={propertyCardData(property)} priority={priority} />;
}

export type Credit = { label: string; artist: string; license: string; licenseUrl: string; source: string };

export function Footer({ credits = [] }: { credits?: Credit[] }) {
  return (
    <footer className="footer on-field">
      <div className="container footer-inner">
        <p className="footer-letter">If a listing or a product fits what you are planning, write to us with its reference. We reply with the verified details.</p>
        <p className="footer-signoff"><span className="footer-name">{BRAND}</span><span>Chennai, Tamil Nadu</span></p>
        <nav className="footer-links" aria-label="Footer">
          <a href="/properties">Properties</a>
          <a href="/products">Products</a>
          <a href="/#divisions">Services</a>
          <a href="/#why-us">About us</a>
          <a href="/contact">Send an enquiry</a>
          <a href="/privacy">Privacy notice</a>
          <a href="/admin" rel="nofollow">Staff login</a>
        </nav>
        <p className="footer-legal">© {BRAND}. Address, phone, business email and registration details are being verified. Terms of use are in preparation.</p>
        {credits.length > 0 && (
          <p className="footer-credits" data-credits>
            Photographs: {credits.map((c, i) => (
              <span key={c.source}>
                {i > 0 && "; "}
                {c.label}, <a href={c.source} target="_blank" rel="noopener noreferrer">{c.artist}</a>
                {c.licenseUrl ? <>, <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">{c.license}</a></> : `, ${c.license}`}
              </span>
            ))}
          </p>
        )}
      </div>
    </footer>
  );
}

/** Credits for library photos shown on a page (the user's own uploads carry none). */
export function creditsFor(items: { name: string; image: { credit?: Omit<Credit, "label"> | null } | null }[]): Credit[] {
  return items.flatMap((item) => (item.image?.credit ? [{ label: item.name, ...item.image.credit }] : []));
}
