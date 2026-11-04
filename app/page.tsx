import Link from "next/link";
import { Footer, Header, PropertyCard, SectionLabel } from "./site-components";

const properties = [
  {
    image: "/asms-hero.png",
    reference: "ASMS-PREVIEW-01",
    location: "Chennai, Tamil Nadu",
    title: "Residential plot opportunity",
    type: "Plotted land",
    area: "Area to be verified",
    price: "Price on request",
    status: "Sample listing",
  },
  {
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85",
    reference: "ASMS-PREVIEW-02",
    location: "Greater Chennai",
    title: "Well-connected land parcel",
    type: "Land",
    area: "Dimensions to be verified",
    price: "Enquire for details",
    status: "Sample listing",
  },
  {
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
    reference: "ASMS-PREVIEW-03",
    location: "Chennai region",
    title: "Independent property",
    type: "Residential",
    area: "Specification pending",
    price: "Price on request",
    status: "Sample listing",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <Header overlay />
        <div className="hero-shade" />
        <div className="hero-content page-shell">
          <div className="hero-copy">
            <SectionLabel light>Real estate · Construction · Products</SectionLabel>
            <h1>
              Building trust.
              <br />
              Creating <em>lasting value.</em>
            </h1>
            <p>
              Explore considered real estate opportunities, dependable construction
              products and engineering expertise—all with clear information and
              direct guidance.
            </p>
            <div className="hero-actions">
              <Link className="button button-gold" href="/properties">
                Explore properties <span aria-hidden="true">↗</span>
              </Link>
              <a className="button button-glass" href="#divisions">
                View our capabilities
              </a>
            </div>
          </div>
          <aside className="hero-note" aria-label="Our approach">
            <span className="note-index">01</span>
            <div>
              <strong>Clarity before commitment</strong>
              <p>Verified details, transparent conversations and practical guidance.</p>
            </div>
          </aside>
        </div>
        <div className="hero-trust">
          <div className="page-shell trust-row">
            <span>Based in Chennai</span>
            <i aria-hidden="true" />
            <span>Direct business enquiries</span>
            <i aria-hidden="true" />
            <span>Property &amp; product transparency</span>
          </div>
        </div>
      </section>

      <section className="intro page-shell section-space">
        <div>
          <SectionLabel>One team · Three capabilities</SectionLabel>
          <h2>A practical partner across the built environment.</h2>
        </div>
        <div className="intro-copy">
          <p>
            ASMS–ROUNAQH brings property opportunities, construction materials and
            engineering services together under one accountable relationship.
          </p>
          <a className="text-link" href="#why-us">
            Learn how we work <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section className="divisions page-shell" id="divisions">
        <article className="division-card division-land">
          <span className="division-number">01</span>
          <div>
            <p>For buyers &amp; investors</p>
            <h3>Real Estate</h3>
            <span>Curated land and property opportunities with details that help you evaluate confidently.</span>
            <Link href="/properties" aria-label="Explore real estate">
              Explore <b aria-hidden="true">↗</b>
            </Link>
          </div>
        </article>
        <article className="division-card division-products">
          <span className="division-number">02</span>
          <div>
            <p>For builders &amp; businesses</p>
            <h3>Construction Products</h3>
            <span>Building materials and engineered products supported by clear technical specifications.</span>
            <a href="#products" aria-label="Explore construction products">
              Explore <b aria-hidden="true">↗</b>
            </a>
          </div>
        </article>
        <article className="division-card division-services">
          <span className="division-number">03</span>
          <div>
            <p>For projects of purpose</p>
            <h3>Construction Services</h3>
            <span>Thoughtful construction and engineering solutions, from conventional builds to specialist work.</span>
            <a href="#contact" aria-label="Explore construction services">
              Explore <b aria-hidden="true">↗</b>
            </a>
          </div>
        </article>
      </section>

      <section className="properties-section section-space">
        <div className="page-shell">
          <div className="section-heading heading-row">
            <div>
              <SectionLabel>Selected opportunities</SectionLabel>
              <h2>Properties worth a closer look.</h2>
            </div>
            <div className="heading-side">
              <p>Every live listing will present price, dimensions, location and document status clearly.</p>
              <Link className="text-link" href="/properties">
                View all properties <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="preview-notice">
            Design preview — listing names and details below are placeholders until verified business data is supplied.
          </div>
          <div className="property-grid">
            {properties.map((property) => (
              <PropertyCard key={property.reference} {...property} />
            ))}
          </div>
        </div>
      </section>

      <section className="products-band" id="products">
        <div className="products-image" role="img" aria-label="Structural construction materials" />
        <div className="products-copy">
          <SectionLabel light>Construction products</SectionLabel>
          <h2>Materials chosen for the work they need to do.</h2>
          <p>
            A specification-led catalogue for contractors, architects, industrial
            buyers and project owners—built to make product comparison and quotation
            requests straightforward.
          </p>
          <div className="product-links">
            <a href="#contact"><span>Structural steel &amp; PEB components</span><b>→</b></a>
            <a href="#contact"><span>Roofing &amp; building materials</span><b>→</b></a>
            <a href="#contact"><span>Concrete &amp; finishing products</span><b>→</b></a>
          </div>
          <a className="button button-ivory" href="#contact">Browse product catalogue</a>
        </div>
      </section>

      <section className="why page-shell section-space" id="why-us">
        <div className="why-heading">
          <SectionLabel>Why ASMS–ROUNAQH</SectionLabel>
          <h2>Confidence comes from what you can see and verify.</h2>
          <p>No inflated claims. No artificial urgency. Just useful details, clear accountability and informed support.</p>
        </div>
        <div className="principles">
          <article><span>01</span><h3>Transparent information</h3><p>Pricing, specifications and document status are presented in a consistent, understandable format.</p></article>
          <article><span>02</span><h3>Practical expertise</h3><p>Property and product conversations are grounded in real construction knowledge.</p></article>
          <article><span>03</span><h3>Direct guidance</h3><p>Speak with the team responsible, from your first question through the next step.</p></article>
          <article><span>04</span><h3>Evidence-led trust</h3><p>Actual project work, genuine imagery and verified credentials will speak for the business.</p></article>
        </div>
      </section>

      <section className="contact-band" id="contact">
        <div className="page-shell contact-inner">
          <SectionLabel light>Buy with confidence</SectionLabel>
          <h2>Looking to buy property or source construction products?</h2>
          <p>Explore available properties or tell us which building materials and product specifications you need.</p>
          <div>
            <Link className="button button-gold" href="/properties">Explore properties</Link>
            <Link className="button button-outline-light" href="/contact">Enquire about products</Link>
          </div>
          <small>Contact details shown in this preview are placeholders pending verification.</small>
        </div>
      </section>

      <Footer />
    </main>
  );
}
