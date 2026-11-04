import { Footer, Header, SectionLabel } from "../site-components";
import EnquiryForm from "./enquiry-form";

export const metadata = {
  title: "Contact | ASMS–ROUNAQH",
  description: "Contact ASMS–ROUNAQH about property opportunities or construction products.",
};

export default function ContactPage() {
  return (
    <main className="contact-page">
      <Header />
      <section className="contact-hero">
        <div className="page-shell contact-hero-grid">
          <div>
            <SectionLabel light>Contact ASMS–ROUNAQH</SectionLabel>
            <h1>Let’s discuss what you’re <em>looking to buy.</em></h1>
          </div>
          <p>Whether you are evaluating a property or sourcing construction products, share the essentials and our team will guide the next conversation.</p>
        </div>
      </section>

      <section className="contact-main page-shell section-space">
        <aside className="contact-details">
          <SectionLabel>Direct assistance</SectionLabel>
          <h2>Clear answers begin with the right details.</h2>
          <p>Tell us your intended use, location or product specification. We’ll respond with relevant information—without artificial urgency.</p>
          <div className="contact-methods">
            <article><span>01</span><div><small>Call</small><strong>Verified phone number to be added</strong><p>For property and product enquiries</p></div></article>
            <article><span>02</span><div><small>Email</small><strong>Business email to be added</strong><p>For detailed requirements and documents</p></div></article>
            <article><span>03</span><div><small>Visit</small><strong>Verified Chennai office address to be added</strong><p>Visits by prior appointment</p></div></article>
          </div>
          <div className="contact-hours"><span>Business hours</span><strong>Hours to be confirmed</strong></div>
        </aside>
        <div>
          <div className="preview-notice contact-notice">Design preview — the form currently demonstrates validation and confirmation. Email delivery will be connected after the verified recipient address is supplied.</div>
          <EnquiryForm />
        </div>
      </section>

      <section className="contact-confidence">
        <div className="page-shell confidence-grid">
          <div><span>Property enquiries</span><h3>Reference-led conversations</h3><p>Include the property reference so details, documents and site-visit requests stay specific.</p></div>
          <div><span>Product enquiries</span><h3>Specification-led quotations</h3><p>Share product type, dimensions, quantity and delivery location for a more useful response.</p></div>
          <div><span>Your privacy</span><h3>Purpose-limited contact</h3><p>Your information is used only to understand and respond to the enquiry you submit.</p></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
