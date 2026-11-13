import { COMPANY } from "@/lib/company";
import { BRAND, Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "About | ASMS‑ROUNAQH",
  description: "ASMS‑ROUNAQH, Chennai: a construction and development business continuing a legacy since 1885.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">{`Continuing a legacy since ${COMPANY.since}`}</h1>
            <p className="lead">Real expertise, real estate and real buildings, from one Chennai business.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="About the company">
          <div className="container prose">
            <p className="lead">{BRAND} is a construction and development business built on trust and experience. Its work has spanned residential colonies for the Armed Forces, religious structures, heritage buildings and modern engineered construction.</p>
            <p>The organisation has been led for more than three decades by {COMPANY.leader}, with a commitment to quality, responsibility and continuous progress. Today it combines that experience with new technology, and is introducing 3D concrete printing as a modern way to build.</p>
            <h2>How we work</h2>
            <ul>
              <li><strong>Pioneering craftsmanship:</strong> practical experience with a commitment to quality construction.</li>
              <li><strong>Progressive engineering:</strong> engineering knowledge applied to modern construction requirements.</li>
              <li><strong>Forward-thinking design:</strong> looking beyond conventional approaches to create purposeful spaces.</li>
              <li><strong>Ingenious engineering:</strong> practical and innovative solutions for the built environment.</li>
            </ul>
            <h2>Property and materials, from builders</h2>
            <p>The same understanding of land and construction sits behind the properties and construction products on this site: listings reviewed before they go live, and materials described by grade and standard.</p>
          </div>
        </section>

        <section className="band on-field" aria-labelledby="visit-title">
          <div className="container close-plain">
            <div>
              <h2 id="visit-title">Registered office</h2>
              <p>{COMPANY.address.join(", ")}. Call or WhatsApp {COMPANY.phone}, or write to {COMPANY.email}.</p>
            </div>
            <div className="actions">
              <a className="btn" href="/contact">Contact the team</a>
              <a className="link" href="/services">Our services</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
