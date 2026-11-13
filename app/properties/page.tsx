import { isSample, properties } from "@/lib/content";
import { CATEGORIES, categoryLabel } from "@/lib/property";
import type { PropertyCategory } from "@/lib/content-types";
import Catalog, { type CatalogFilter, type CatalogSort, type CatalogTabs } from "../catalog";
import { Footer, Header, PropertyCard } from "../site-components";

const BUDGETS = [
  { value: "0-5000000", label: "Under ₹50 L" },
  { value: "5000000-10000000", label: "₹50 L to ₹1 Cr" },
  { value: "10000000-20000000", label: "₹1 Cr to ₹2 Cr" },
  { value: "20000000-", label: "Above ₹2 Cr" },
  { value: "empty", label: "Price on request" },
];
const AREAS_SQFT = [
  { value: "0-1000", label: "Under 1,000 sq ft" },
  { value: "1000-2000", label: "1,000 to 2,000 sq ft" },
  { value: "2000-5000", label: "2,000 to 5,000 sq ft" },
  { value: "5000-", label: "5,000 sq ft and above" },
];
const ACRE = 43560;
const AREAS_ACRES = [
  { value: `0-${ACRE}`, label: "Under 1 acre" },
  { value: `${ACRE}-${5 * ACRE}`, label: "1 to 5 acres" },
  { value: `${5 * ACRE}-`, label: "5 acres and above" },
];
const SORTS: CatalogSort[] = [
  { value: "recommended", label: "Recommended", kind: "order" },
  { value: "newest", label: "Newest", kind: "date", attr: "posted" },
  { value: "price-asc", label: "Price, low to high", kind: "number", attr: "price", dir: 1 },
  { value: "price-desc", label: "Price, high to low", kind: "number", attr: "price", dir: -1 },
  { value: "area", label: "Area, largest first", kind: "number", attr: "area", dir: -1 },
];

export const dynamic = "force-static";

export const metadata = {
  title: "Properties | ASMS‑ROUNAQH",
  description: "Homes, plots, commercial and agricultural property in and around Chennai, each with price, area, location and document status upfront.",
  alternates: { canonical: "/properties" },
};

const distinct = <T,>(values: (T | null)[]) => [...new Set(values.filter((v): v is T => v !== null && v !== ""))];
const opts = (values: (string | null)[]) => distinct(values).sort().map((v) => ({ value: v, label: v }));

/** Filters for the properties on sale, per PRD section 6. A filter is left out when the listings give it fewer than two choices. */
function buildFilters(): CatalogFilter[] {
  const inTab = (c: PropertyCategory) => properties.filter((p) => p.category === c);
  const homes = inTab("residential"), plots = inTab("plot"), shops = inTab("commercial");
  const maxRoad = Math.max(0, ...properties.map((p) => p.roadWidthFt ?? 0));
  const filters: CatalogFilter[] = [
    { name: "location", label: "Location", attr: "location", kind: "equals", options: opts(properties.map((p) => p.location)) },
    { name: "budget", label: "Budget", attr: "price", kind: "range", options: BUDGETS },
    { name: "home", label: "Home type", attr: "subtype", kind: "equals", tabs: ["residential"], options: opts(homes.map((p) => p.propertyType)) },
    { name: "bhk", label: "Bedrooms", attr: "bhk", kind: "equals", tabs: ["residential"], options: distinct(homes.map((p) => p.bhk)).sort((a, b) => a - b).map((n) => ({ value: String(n), label: `${n} BHK` })) },
    { name: "possession", label: "Possession", attr: "possession", kind: "equals", tabs: ["residential", "commercial"], options: opts([...homes, ...shops].map((p) => p.possession)) },
    { name: "plot", label: "Plot type", attr: "subtype", kind: "equals", tabs: ["plot"], options: opts(plots.map((p) => p.propertyType)) },
    { name: "use", label: "Space type", attr: "subtype", kind: "equals", tabs: ["commercial"], options: opts(shops.map((p) => p.propertyType)) },
    { name: "facing", label: "Facing", attr: "facing", kind: "equals", tabs: ["residential", "plot"], options: opts([...homes, ...plots].map((p) => p.facing)) },
    { name: "road", label: "Road width", attr: "road", kind: "min", tabs: ["plot", "agricultural"], options: [20, 30, 40, 60].filter((w) => w <= maxRoad).map((w) => ({ value: String(w), label: `${w} ft or wider` })) },
    { name: "area", label: "Area", attr: "area", kind: "range", tabs: ["all", "residential", "plot", "commercial"], options: AREAS_SQFT },
    { name: "acres", label: "Area", attr: "area", kind: "range", tabs: ["agricultural"], options: AREAS_ACRES },
  ];
  return filters.filter((f) => f.kind === "range" || (f.kind === "min" ? f.options.length > 0 : f.options.length >= 2));
}

export default function PropertiesPage() {
  const stocked = CATEGORIES.filter((c) => properties.some((p) => p.category === c.id));
  const tabs: CatalogTabs | undefined = stocked.length > 1
    ? { name: "type", attr: "category", label: "Property type", allLabel: "All", options: stocked.map((c) => ({ value: c.id, label: c.tab })) }
    : undefined;
  const filters = buildFilters();

  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Property for sale around Chennai</h1>
            <p className="lead">Each listing shows price, area, location and document status upfront.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Listings">
          <div className="container">
            {isSample && <p className="notice">Design preview: all listing details are placeholders. Only verified ASMS&#8209;ROUNAQH inventory will be published.</p>}
            {properties.length === 0 ? (
              <p className="empty-state">New listings are being prepared. <a className="link" href="/contact">Tell us what you are looking for</a> and we will be in touch.</p>
            ) : (
              <Catalog label="Properties" tabs={tabs} search="Locality, landmark or reference" filters={filters} sorts={SORTS} total={properties.length}>
                {properties.map((p, i) => (
                  <li key={p.slug} data-order={i} data-category={p.category} data-subtype={p.propertyType} data-location={p.location}
                    data-price={p.price ?? ""} data-area={p.areaSqFt ?? ""} data-posted={p.postedOn ?? ""} data-bhk={p.bhk ?? ""}
                    data-possession={p.possession ?? ""} data-facing={p.facing ?? ""} data-road={p.roadWidthFt ?? ""}
                    data-search={[p.title, p.location, p.locality, p.propertyType, categoryLabel(p.category), p.reference].filter(Boolean).join(" ").toLowerCase()}>
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
