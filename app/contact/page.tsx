import { Footer, Header } from "../site-components";
import EnquiryForm from "./enquiry-form";

export const dynamic = "force-static";

export const metadata = {
  title: "Contact | ASMS‑ROUNAQH",
  description: "Contact ASMS‑ROUNAQH about property opportunities or construction products.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Ask about a property or a product</h1>
            <p className="lead">Share the essentials and the team will guide the next conversation.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Enquiry">
          <div className="container contact-split">
            <div className="contact-facts">
              <h2>Clear answers begin with the right details</h2>
              <p>Tell us your intended use, location or product specification. We respond with relevant information and no artificial urgency.</p>
              <dl>
                <div><dt>Call</dt><dd><span className="fill" data-fill="phone">Phone number to be added</span><small>For property and product enquiries</small></dd></div>
                <div><dt>Email</dt><dd><span className="fill" data-fill="email">Business email to be added</span><small>For detailed requirements and documents</small></dd></div>
                <div><dt>Visit</dt><dd>Chennai office<small>Visits by prior appointment</small></dd></div>
              </dl>
            </div>
            <EnquiryForm />
          </div>
        </section>

        <section className="sec sec--field on-field" aria-labelledby="assure-title">
          <div className="container">
            <div className="head-split"><h2 id="assure-title">How we handle your enquiry</h2></div>
            <ul className="assurances">
              <li><h3>Reference-led conversations</h3><p>Include the property reference so details, documents and site visits stay specific.</p></li>
              <li><h3>Specification-led quotations</h3><p>Share product type, dimensions, quantity and delivery location for a useful response.</p></li>
              <li><h3>Purpose-limited contact</h3><p>Your information is used only to understand and respond to the enquiry you submit.</p></li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
