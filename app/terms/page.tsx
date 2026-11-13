import { BRAND, Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Terms of use | ASMS‑ROUNAQH",
  description: "The terms for using the ASMS‑ROUNAQH website, its listings and its enquiry forms.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Terms of use</h1>
            <p className="lead">The terms for using this website, its listings and its forms.</p>
          </div>
        </section>
        <section className="sec sec--list" aria-label="Terms of use">
          <div className="container prose">
            <h2>Who we are</h2>
            <p>This website is run by {BRAND}, Chennai, Tamil Nadu. It presents properties for sale, construction products and related services, and lets you send enquiries to our team.</p>

            <h2>Listings and information</h2>
            <p>Property and product details are provided by property owners and by {BRAND}, and are reviewed before publication. They are offered in good faith but can change, and they are not an offer or a contract. Read the <a className="link" href="/disclaimer">disclaimer</a> before relying on any listing.</p>

            <h2>Enquiries and site visits</h2>
            <p>Sending an enquiry or a site visit request does not reserve a property or book an appointment. Our team will contact you to confirm next steps. Please give accurate contact details and use the forms only for genuine enquiries.</p>

            <h2>Listing a property with us</h2>
            <p>Owners who list a property confirm that they have the right to sell it and that the information they give is accurate. {BRAND} may ask for documents, request changes, decline a listing or take it down.</p>

            <h2>Acceptable use</h2>
            <p>Do not misuse the website: no automated scraping or bulk submissions, no attempts to reach data or areas you are not given access to, and no copying of photographs or content for other listings without permission.</p>

            <h2>Liability</h2>
            <p>The website is provided as it is. To the extent the law allows, {BRAND} is not liable for decisions made only on the information shown here, or for interruptions to the website.</p>

            <h2>Law</h2>
            <p>These terms are governed by the laws of India, and the courts at Chennai have jurisdiction.</p>

            <h2>Changes</h2>
            <p>If these terms change, the new version will be published on this page. Questions can be sent through the <a className="link" href="/contact">contact page</a>.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
