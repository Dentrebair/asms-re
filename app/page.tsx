import { HERO_IMAGE, areaLabel, isSample, priceLabel, properties } from "@/lib/content";
import PinnedHighlight from "./pinned-highlight";
import { Footer, Header, PropertyCard, type Credit } from "./site-components";

// Library photograph for the products showcase (Wikimedia Commons), credited in the footer.
const STEEL_PHOTO = { src: "/showcase-steel.webp", width: 3171, height: 1953 };
const STEEL_CREDIT: Credit = { label: "Steel reinforcement bars", artist: "W.carter", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", source: "https://commons.wikimedia.org/wiki/File:A_bunch_of_rebar_up_close.jpg" };

export const dynamic = "force-static";

export default function Home() {
  const listing = properties[0];
  const sheet = sheetRows(listing);

  return (
    <>
      <Header />
      <main id="main">
        <link rel="preload" as="image" href={HERO_IMAGE} type="image/webp" fetchPriority="high" />

        <section className="hero" aria-labelledby="hero-title">
          <figure className="hero-photo" data-slot="hero" data-alt="A recent property or project, photographed on site in daylight">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMAGE} width={1536} height={1024} alt="A two-storey house with a tiled roof behind a garden" fetchPriority="high" />
          </figure>
          <div className="container hero-inner">
            <div className="hero-plate">
              <h1 id="hero-title">Chennai plots, homes and building supplies.</h1>
              <p className="lead">Checked listings and specified materials, from one accountable team.</p>
              <div className="actions">
                <a className="btn" href="/properties">Browse properties</a>
                <a className="link" href="/products">Request a material quote</a>
              </div>
            </div>
            <p className="hero-caption">Chennai, Tamil Nadu</p>
          </div>
        </section>

        <section className="sec sec--list" aria-labelledby="listings-title">
          <div className="container head-split">
            <h2 id="listings-title">Plots and homes for sale now</h2>
            <div>
              <p className="lead">Price, area, location and document status on every listing.</p>
              <a className="link" href="/properties">See all {properties.length} properties</a>
            </div>
          </div>
          {isSample && <p className="container notice">Design preview: these listings are samples until verified inventory is added.</p>}
          <div className="container">
            <ul className="card-grid" aria-label="Properties for sale">
              {properties.slice(0, 6).map((p, i) => <li key={p.slug}><PropertyCard property={p} priority={i < 3} /></li>)}
            </ul>
          </div>
        </section>

        <section className="sec sec--field on-field" id="divisions" aria-labelledby="divisions-title">
          <div className="container rows-layout">
            <div className="rows-head">
              <h2 id="divisions-title">Land, materials and building, one team</h2>
              <p>ASMS&#8209;ROUNAQH brings property, construction materials and engineering services under one accountable relationship.</p>
              <a className="link" href="#why-us">Learn how we work</a>
            </div>
            <ul className="rows">
              <li>
                <h3>Real estate</h3>
                <p>For buyers and investors: land and homes with the details you need to evaluate them.</p>
                <a className="link" href="/properties" aria-label="Explore real estate">Explore</a>
              </li>
              <li>
                <h3>Construction products</h3>
                <p>For builders and businesses: materials and engineered products with clear specifications.</p>
                <a className="link" href="/products" aria-label="Explore construction products">Explore</a>
              </li>
              <li>
                <h3>Construction services</h3>
                <p>For projects of purpose: conventional builds through to specialist engineering work.</p>
                <a className="link" href="#contact" aria-label="Explore construction services">Explore</a>
              </li>
            </ul>
          </div>
        </section>

        <section className="showcase" id="products" aria-labelledby="products-title">
          <figure className="showcase-photo" data-slot="products" data-alt="Materials from your own yard or a recent delivery, close up">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={STEEL_PHOTO.src} width={STEEL_PHOTO.width} height={STEEL_PHOTO.height} alt="Ribbed steel reinforcement bars stacked side by side" loading="lazy" decoding="async" />
          </figure>
          <div className="container showcase-inner">
            <div className="showcase-plate on-field">
              <h2 id="products-title">Steel, roofing and concrete, specified</h2>
              <p>A catalogue for contractors, architects, industrial buyers and project owners, built to make comparison and quotation requests straightforward.</p>
              <ul className="plate-links">
                <li><a href="/products?category=steel-peb">Steel and PEB components</a></li>
                <li><a href="/products?category=roofing">Roofing and walling</a></li>
                <li><a href="/products?category=concrete-finishing">Concrete and finishing</a></li>
              </ul>
              <a className="btn btn--quiet" href="/products">Browse the catalogue</a>
            </div>
          </div>
        </section>

        <section className="sec sec--pinned" id="why-us" aria-labelledby="why-title">
          <div className="container pinned">
            <div className="pinned-panels">
              <h2 id="why-title">What every listing tells you</h2>
              <p className="lead">No inflated claims and no artificial urgency, just details you can check.</p>
              <article data-panel="1"><h3>Transparent information</h3><p>Price, area and specifications in one consistent, readable format.</p></article>
              <article data-panel="2"><h3>Practical expertise</h3><p>Conversations about land and materials grounded in real construction knowledge.</p></article>
              <article data-panel="3"><h3>Direct guidance</h3><p>You speak with the team responsible, from the first question through the next step.</p></article>
              <article data-panel="4"><h3>Evidence-led trust</h3><p>Document status stated plainly, and an independent legal review always recommended.</p></article>
            </div>
            <figure className="pinned-visual sheet" aria-labelledby="sheet-caption">
              <figcaption id="sheet-caption">{listing ? `${listing.title}, ref. ${listing.reference}` : "A listing fact sheet"}</figcaption>
              <dl>
                {sheet.map((row) => <div key={row.label} data-step={row.step}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
              </dl>
            </figure>
          </div>
          <PinnedHighlight root="why-us" />
        </section>

        <section className="band on-field" id="contact" aria-labelledby="contact-title">
          <div className="container close">
            <div className="close-head">
              <h2 id="contact-title">Ask about a plot or a quote</h2>
              <p className="lead">Share a listing reference or a product specification, and the team replies directly.</p>
            </div>
            <ul className="routes">
              <li><a href="/properties"><small>Buying property</small><span>Explore properties</span></a></li>
              <li><a href="/contact"><small>Sourcing materials</small><span>Enquire about products</span></a></li>
            </ul>
            <p className="close-note">Phone, email and office address will appear here once verified.</p>
          </div>
        </section>
      </main>
      <Footer credits={[STEEL_CREDIT]} />
    </>
  );
}

function sheetRows(p: (typeof properties)[number] | undefined) {
  if (!p) return [];
  const doc = (label: string) => p.documents.find((d) => d.label.toLowerCase().includes(label))?.status;
  const rows: { step: string; label: string; value: string | null }[] = [
    { step: "1", label: "Asking price", value: priceLabel(p) },
    { step: "1", label: "Area", value: areaLabel(p) },
    { step: "2", label: "Road width", value: p.roadWidthFt ? `${p.roadWidthFt} ft` : null },
    { step: "2", label: "Floors allowed", value: p.floorsAllowed },
    { step: "3", label: "Reference", value: p.reference },
    { step: "3", label: "Site visits", value: "By prior appointment" },
    { step: "4", label: "Layout approval", value: doc("layout") ?? p.approval },
    { step: "4", label: "Independent legal review", value: doc("legal") ?? "Recommended for buyers" },
  ];
  return rows.filter((r): r is { step: string; label: string; value: string } => Boolean(r.value));
}
