import { isSample, properties } from "@/lib/content";
import { Footer, Header, PropertyCard, SectionLabel } from "../site-components";


export const dynamic = "force-static";

export const metadata = {
  title: "Properties | ASMS–ROUNAQH",
  description: "Explore property opportunities presented with clear, transparent information.",
};

export default function PropertiesPage() {
  return (
    <main className="properties-page">
      <Header />
      <section className="listing-hero">
        <div className="page-shell listing-title">
          <div>
            <SectionLabel>Curated real estate</SectionLabel>
            <h1>Find the right ground for your <em>next chapter.</em></h1>
          </div>
          <p>Explore a considered selection of properties presented with the information you need to evaluate them confidently.</p>
        </div>
        <div className="page-shell filter-bar" role="search" aria-label="Property filters">
          <label><span>Location</span><select defaultValue="all"><option value="all">All Chennai areas</option><option>Chennai city</option><option>Greater Chennai</option></select></label>
          <label><span>Property type</span><select defaultValue="all"><option value="all">All types</option><option>Plotted land</option><option>Residential</option></select></label>
          <label><span>Budget</span><select defaultValue="all"><option value="all">Any budget</option><option>Price on request</option></select></label>
          <label><span>Area</span><select defaultValue="all"><option value="all">Any size</option><option>Under 2,000 sq ft</option><option>2,000+ sq ft</option></select></label>
          <button type="button">Show properties <span>→</span></button>
        </div>
      </section>

      <section className="listing-content page-shell section-space">
        <div className="listing-toolbar">
          <div><strong>Property showcase</strong><span>{properties.length} {isSample ? "design-preview listings" : properties.length === 1 ? "listing" : "listings"}</span></div>
          <label>Sort by <select defaultValue="recommended"><option value="recommended">Recommended</option><option>Newest</option><option>Price: low to high</option></select></label>
        </div>
        {isSample && <div className="preview-notice">Design preview — all listing details are placeholders. Only verified ASMS–ROUNAQH inventory will be published.</div>}
        {properties.length === 0 && <p className="empty-state">New listings are being prepared. <a href="/contact">Tell us what you are looking for</a> and we’ll be in touch.</p>}
        <div className="property-grid listing-grid">
          {properties.map((property, index) => <PropertyCard key={property.slug} property={property} priority={index < 3} />)}
        </div>
      </section>

      <section className="buyer-guide">
        <div className="page-shell buyer-guide-inner">
          <div>
            <SectionLabel light>Buy with clarity</SectionLabel>
            <h2>Every property should answer the important questions.</h2>
          </div>
          <div className="guide-points">
            <article><span>01</span><h3>Know the essentials</h3><p>Location, dimensions, access, utilities and asking price presented upfront.</p></article>
            <article><span>02</span><h3>Understand documents</h3><p>Available approvals and document status described without misleading guarantees.</p></article>
            <article><span>03</span><h3>Visit with context</h3><p>Request a site visit using the listing reference, so every conversation stays specific.</p></article>
          </div>
        </div>
      </section>

      <section className="listing-cta page-shell section-space">
        <div>
          <SectionLabel>Personal property guidance</SectionLabel>
          <h2>Not sure which opportunity fits?</h2>
          <p>Share your preferred location, intended use and budget range. We’ll help narrow the search responsibly.</p>
        </div>
        <div><a className="button button-green" href="/contact">Speak with our team</a><a className="text-link" href="/">Return home →</a></div>
      </section>
      <Footer />
    </main>
  );
}
