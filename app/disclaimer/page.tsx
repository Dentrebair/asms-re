import { BRAND, Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Disclaimer | ASMS‑ROUNAQH",
  description: "What the property and product information on the ASMS‑ROUNAQH website does and does not confirm.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Disclaimer</h1>
            <p className="lead">What the information on this website does, and does not, confirm.</p>
          </div>
        </section>
        <section className="sec sec--list" aria-label="Disclaimer">
          <div className="container prose">
            <h2>Check before you buy</h2>
            <p>Listings describe a property as provided by its owner and reviewed by {BRAND}. They do not certify title, ownership, boundaries or legal status. Before any payment or agreement, arrange your own legal review of the title documents, a site inspection and any survey you need.</p>

            <h2>Approvals and registration</h2>
            <p>Approval authorities (such as DTCP or CMDA) and RERA registration numbers are shown only as entered by {BRAND}. Where none is shown, none should be assumed. Verify registrations with the issuing authority, for example the Tamil Nadu Real Estate Regulatory Authority for RERA.</p>

            <h2>Prices, areas and availability</h2>
            <p>Prices are asking prices and may change. Areas are approximate, and conversions between square feet, square yards, cents and acres are rounded. A property can be sold or withdrawn before the website updates; each listing shows when its details were last confirmed.</p>

            <h2>No investment advice</h2>
            <p>Nothing on this website is a promise of returns or investment advice.</p>

            <h2>Photographs</h2>
            <p>Photographs show the property or product as supplied. Where a photograph is illustrative, the page says so.</p>

            <h2>Construction products</h2>
            <p>Specifications describe typical grades and standards. Prices, availability and delivery are confirmed only in a written quotation. Warranties are those of the manufacturer, where one applies.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
