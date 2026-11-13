import { Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Sell a property | ASMS‑ROUNAQH",
  description: "List a plot, home, commercial space or agricultural land in and around Chennai with ASMS‑ROUNAQH. Every listing is reviewed before it goes live.",
  alternates: { canonical: "/sell" },
};

const sellHref = `/contact?category=${encodeURIComponent("Selling a property")}`;

export default function SellPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Sell your property with ASMS&#8209;ROUNAQH</h1>
            <p className="lead">Homes, plots and commercial space, reviewed before buyers see them.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-labelledby="steps-title">
          <div className="container">
            <div className="head-split"><h2 id="steps-title">How listing works</h2></div>
            <ol className="steps">
              <li><h3>Describe the property</h3><p>Type, location, price, area and the facts buyers of that type ask about: bedrooms for a home, road width and frontage for a plot, usable area for commercial space.</p></li>
              <li><h3>Add photos and documents</h3><p>Real photographs of the property. Patta, EC and approvals stay private: only our reviewers see them, never visitors.</p></li>
              <li><h3>We review, then publish</h3><p>We check the details and documents, ask for corrections where needed, and publish once everything is in order. Submitted is not the same as live.</p></li>
            </ol>
          </div>
        </section>

        <section className="sec sec--field on-field" aria-labelledby="after-title">
          <div className="container rows-layout">
            <div className="rows-head">
              <h2 id="after-title">After it goes live</h2>
              <p>Buyers enquire through ASMS&#8209;ROUNAQH. We follow up every enquiry and keep you informed; buyers&rsquo; personal details are shared only with their permission.</p>
            </div>
            <ul className="rows rows--two">
              <li><h3>See how it performs</h3><p>Views, saves and enquiries for your listing, counted the same way for every property.</p></li>
              <li><h3>Keep it current</h3><p>Price changes are reviewed before they appear, and we ask you to reconfirm availability regularly so nothing stale stays online.</p></li>
              <li><h3>Mark it sold</h3><p>Once it sells, the listing leaves search and stops taking enquiries.</p></li>
            </ul>
          </div>
        </section>

        <section className="band" aria-labelledby="start-title">
          <div className="container close-plain">
            <div>
              <h2 id="start-title">Start with a call</h2>
              <p>Online seller accounts are not open yet. Tell us about the property and the team will call you to take the details.</p>
            </div>
            <div className="actions"><a className="btn" href={sellHref}>Request a callback</a></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
