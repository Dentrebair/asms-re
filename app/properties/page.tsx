import { isSample, properties } from "@/lib/content";
import Catalog, { type CatalogFilter, type CatalogSort } from "../catalog";
import { Footer, Header, PropertyCard } from "../site-components";

const BUDGETS = [
  { value: "0-5000000", label: "Under ₹50 L" },
  { value: "5000000-10000000", label: "₹50 L to ₹1 Cr" },
  { value: "10000000-", label: "Above ₹1 Cr" },
  { value: "empty", label: "Price on request" },
];
const AREAS = [
  { value: "0-2000", label: "Under 2,000 sq ft" },
  { value: "2000-", label: "2,000 sq ft and above" },
];
const SORTS: CatalogSort[] = [
  { value: "recommended", label: "Recommended", kind: "order" },
  { value: "newest", label: "Newest", kind: "date", attr: "posted" },
  { value: "price-asc", label: "Price, low to high", kind: "number", attr: "price", dir: 1 },
  { value: "price-desc", label: "Price, high to low", kind: "number", attr: "price", dir: -1 },
];

export const dynamic = "force-static";

export const metadata = {
  title: "Properties | ASMS‑ROUNAQH",
  description: "Plots and homes in and around Chennai, each with price, area, location and document status upfront.",
};

export default function PropertiesPage() {
  const locations = [...new Set(properties.map((p) => p.location))].sort();
  const types = [...new Set(properties.map((p) => p.propertyType))].sort();
  const filters: CatalogFilter[] = [
    { name: "location", label: "Location", attr: "location", kind: "equals", options: locations.map((l) => ({ value: l, label: l })) },
    { name: "type", label: "Property type", attr: "type", kind: "equals", options: types.map((t) => ({ value: t, label: t })) },
    { name: "budget", label: "Budget", attr: "price", kind: "range", options: BUDGETS },
    { name: "area", label: "Area", attr: "area", kind: "range", options: AREAS },
  ];

  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Plots and homes around Chennai</h1>
            <p className="lead">Each listing shows price, area, location and document status upfront.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Listings">
          <div className="container">
            {isSample && <p className="notice">Design preview: all listing details are placeholders. Only verified ASMS&#8209;ROUNAQH inventory will be published.</p>}
            {properties.length === 0 ? (
              <p className="empty-state">New listings are being prepared. <a className="link" href="/contact">Tell us what you are looking for</a> and we will be in touch.</p>
            ) : (
              <Catalog label="Properties" filters={filters} sorts={SORTS} total={properties.length}>
                {properties.map((p, i) => (
                  <li key={p.slug} data-order={i} data-location={p.location} data-type={p.propertyType} data-price={p.price ?? ""} data-area={p.areaSqFt ?? ""} data-posted={p.postedOn ?? ""}>
                    <PropertyCard property={p} priority={i < 3} />
                  </li>
                ))}
              </Catalog>
            )}
          </div>
        </section>

        <section className="sec sec--field on-field" aria-labelledby="guide-title">
          <div className="container rows-layout">
            <div className="rows-head">
              <h2 id="guide-title">What to check before you buy</h2>
              <p>Every property should answer the important questions before a visit. Not sure which plot fits? Share your preferred location, intended use and budget range.</p>
              <div className="actions">
                <a className="btn btn--quiet" href="/contact">Speak with our team</a>
                <a className="link" href="/">Return home</a>
              </div>
            </div>
            <ul className="rows rows--two">
              <li><h3>Know the essentials</h3><p>Location, dimensions, access, utilities and asking price, presented upfront.</p></li>
              <li><h3>Understand documents</h3><p>Available approvals and document status, described without misleading guarantees.</p></li>
              <li><h3>Visit with context</h3><p>Request a site visit with the listing reference, so every conversation stays specific.</p></li>
            </ul>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
