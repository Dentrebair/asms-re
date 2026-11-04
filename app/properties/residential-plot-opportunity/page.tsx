import Link from "next/link";
import { Footer, Header, SectionLabel } from "../../site-components";

const gallery = [
  { src: "/asms-hero.png", alt: "Illustrative property preview showing a residence and plotted land" },
  { src: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=88", alt: "Illustrative open land preview" },
  { src: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=88", alt: "Illustrative residential property preview" },
];

export const metadata = {
  title: "Residential Plot Opportunity | ASMS–ROUNAQH",
  description: "Preview a property-detail experience with transparent facts, document status and enquiry options.",
};

export default function PropertyDetailPage() {
  return (
    <main className="property-detail-page">
      <Header />
      <section className="detail-top page-shell">
        <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/properties">Properties</Link><span>/</span><b>ASMS-PREVIEW-01</b></nav>
        <div className="detail-heading">
          <div>
            <div className="detail-kicker"><span>Sample listing</span><small>Reference ASMS-PREVIEW-01</small></div>
            <h1>Residential plot opportunity</h1>
            <p><span aria-hidden="true">⌖</span> Chennai, Tamil Nadu · Exact locality to be verified</p>
          </div>
          <div className="detail-price"><small>Asking price</small><strong>Price on request</strong><span>Final rate and charges to be verified</span></div>
        </div>
      </section>

      <section className="detail-gallery page-shell" aria-label="Property gallery">
        {gallery.map((image, index) => (
          <figure key={image.src} className={index === 0 ? "gallery-main" : ""}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} />
            {index === 0 && <figcaption>Illustrative preview image · replace with actual site photography</figcaption>}
          </figure>
        ))}
        <button type="button">View all photos <span aria-hidden="true">↗</span></button>
      </section>

      <div className="page-shell preview-notice detail-notice">Design preview — every fact on this page is a placeholder until verified property information and genuine site photography are supplied.</div>

      <section className="detail-layout page-shell section-space">
        <div className="detail-content">
          <section>
            <SectionLabel>Property overview</SectionLabel>
            <h2>A clear view of the opportunity.</h2>
            <p className="detail-lead">This page demonstrates how ASMS–ROUNAQH will present each property with consistent facts, document status and practical buying information. Final copy will describe the actual land, surroundings and suitability without unsupported claims.</p>
            <div className="fact-grid">
              <div><small>Property type</small><strong>Plotted land</strong></div>
              <div><small>Land area</small><strong>To be verified</strong></div>
              <div><small>Dimensions</small><strong>To be verified</strong></div>
              <div><small>Availability</small><strong>Confirmation pending</strong></div>
              <div><small>Road access</small><strong>To be verified</strong></div>
              <div><small>Price per sq ft</small><strong>To be verified</strong></div>
            </div>
          </section>

          <section className="detail-section">
            <SectionLabel>Features &amp; infrastructure</SectionLabel>
            <h2>What buyers need to evaluate.</h2>
            <ul className="feature-list">
              <li><span>01</span><div><strong>Site access</strong><p>Approach road width and surface information will be shown after verification.</p></div></li>
              <li><span>02</span><div><strong>Utilities</strong><p>Electricity, water and drainage availability will be stated precisely.</p></div></li>
              <li><span>03</span><div><strong>Nearby infrastructure</strong><p>Relevant transport, schools, healthcare and daily conveniences will be listed with distances.</p></div></li>
              <li><span>04</span><div><strong>Intended use</strong><p>Planning context and suitable development use will be described without giving legal advice.</p></div></li>
            </ul>
          </section>

          <section className="detail-section documents-section">
            <SectionLabel>Documents &amp; approvals</SectionLabel>
            <h2>Transparency before commitment.</h2>
            <p>Available documents will be identified by type and verification status. The website will not describe title as legally clear without appropriate professional review.</p>
            <div className="document-table">
              <div><span>Planning approval</span><strong>Verification pending</strong></div>
              <div><span>Land records</span><strong>Availability to be confirmed</strong></div>
              <div><span>RERA information</span><strong>Applicability to be confirmed</strong></div>
              <div><span>Independent legal review</span><strong>Recommended for buyers</strong></div>
            </div>
          </section>

          <section className="detail-section location-section">
            <SectionLabel>Location</SectionLabel>
            <h2>Understand the surroundings.</h2>
            <div className="map-placeholder"><div className="map-pin">AR</div><span>Verified map location will appear here</span></div>
          </section>
        </div>

        <aside className="detail-enquiry-card">
          <span className="detail-card-label">Interested in this property?</span>
          <h2>Get the verified details.</h2>
          <p>Quote reference <strong>ASMS-PREVIEW-01</strong> when you contact the team.</p>
          <Link className="button button-gold" href="/contact">Enquire about property <span>→</span></Link>
          <Link className="button button-green-outline" href="/contact">Request a site visit</Link>
          <div className="detail-card-note"><span>Before you enquire</span><p>Prepare your preferred location, intended use, budget range and timeline.</p></div>
        </aside>
      </section>

      <section className="detail-bottom-cta">
        <div className="page-shell">
          <div><SectionLabel light>Continue exploring</SectionLabel><h2>Compare other property opportunities.</h2></div>
          <Link className="button button-ivory" href="/properties">View all properties <span>→</span></Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
