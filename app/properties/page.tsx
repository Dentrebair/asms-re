import Link from "next/link";
import { Footer, Header, PropertyCard, SectionLabel } from "../site-components";

const previewProperties = [
  { image: "/asms-hero.png", reference: "ASMS-PREVIEW-01", location: "Chennai, Tamil Nadu", title: "Residential plot opportunity", type: "Plotted land", area: "Area to be verified", price: "Price on request", status: "Sample listing" },
  { image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85", reference: "ASMS-PREVIEW-02", location: "Greater Chennai", title: "Well-connected land parcel", type: "Land", area: "Dimensions to be verified", price: "Enquire for details", status: "Sample listing" },
  { image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85", reference: "ASMS-PREVIEW-03", location: "Chennai region", title: "Independent property", type: "Residential", area: "Specification pending", price: "Price on request", status: "Sample listing" },
  { image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=85", reference: "ASMS-PREVIEW-04", location: "Tamil Nadu", title: "Residential investment opportunity", type: "Residential", area: "Details to be verified", price: "Enquire for details", status: "Sample listing" },
  { image: "https://images.unsplash.com/photo-1524813686514-a57563d77965?auto=format&fit=crop&w=1400&q=85", reference: "ASMS-PREVIEW-05", location: "Chennai outskirts", title: "Open land opportunity", type: "Land", area: "Area to be verified", price: "Price on request", status: "Sample listing" },
  { image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1400&q=85", reference: "ASMS-PREVIEW-06", location: "Greater Chennai", title: "Independent home opportunity", type: "Residential", area: "Specification pending", price: "Enquire for details", status: "Sample listing" },
];

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
          <div><strong>Property showcase</strong><span>6 design-preview listings</span></div>
          <label>Sort by <select defaultValue="recommended"><option value="recommended">Recommended</option><option>Newest</option><option>Price: low to high</option></select></label>
        </div>
        <div className="preview-notice">Design preview — all listing details are placeholders. Only verified ASMS–ROUNAQH inventory will be published.</div>
        <div className="property-grid listing-grid">
          {previewProperties.map((property) => <PropertyCard key={property.reference} {...property} />)}
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
        <div><Link className="button button-green" href="/contact">Speak with our team</Link><Link className="text-link" href="/">Return home →</Link></div>
      </section>
      <Footer />
    </main>
  );
}
