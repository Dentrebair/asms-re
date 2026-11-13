import { SERVICES } from "@/lib/company";
import { Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Services | ASMS‑ROUNAQH",
  description: "Real estate development, construction, PEB structures, heritage structures, religious architecture and 3D concrete printing from ASMS‑ROUNAQH, Chennai.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Development, construction and engineering</h1>
            <p className="lead">Six lines of work, carried by decades of practical building experience.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Services">
          <div className="container">
            <ul className="rows rows--two service-rows">
              {SERVICES.map((s) => <li key={s.id} id={s.id}><h2>{s.title}</h2><p>{s.text}</p></li>)}
            </ul>
          </div>
        </section>

        <section className="band on-field" aria-labelledby="next-title">
          <div className="container close-plain">
            <div>
              <h2 id="next-title">Planning a project?</h2>
              <p>Tell us the site, the scale and the timeline, and the team will set up a conversation.</p>
            </div>
            <div className="actions">
              <a className="btn" href={`/contact?category=${encodeURIComponent("General enquiry")}&interest=${encodeURIComponent("Construction project")}`}>Discuss a project</a>
              <a className="link" href="/products">See construction products</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
