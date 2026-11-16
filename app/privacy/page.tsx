import { BRAND, Footer, Header, PageHead } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Privacy notice | ASMS‑ROUNAQH",
  description: "How ASMS‑ROUNAQH handles the details you send through the website enquiry form.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main">
        <PageHead title="Privacy notice" lead="What happens to the details you send us through this website." />

        <section className="band band--tight" aria-label="Privacy notice">
          <div className="page prose prose--doc">
            <h2>What we collect</h2>
            <p>When you send an enquiry, ask for a site visit or request a quote, we receive your name, phone number, the property or product you ask about, your message, any visit preference or quantity you give, and your email address if you give one.</p>
            <p>Browsing the site does not ask you for any personal details, and we do not use advertising cookies. To count how many people look at each property, your browser keeps a random code; we record that a property page was viewed, shared or its WhatsApp button pressed, with the time. The code is not linked to your name or phone number, and views from our own staff are left out.</p>

            <h2>Why we use it</h2>
            <p>Only to reply to your enquiry: to call or write to you, share property documents or a product quotation, and arrange a site visit if you ask for one. We do not sell your details or use them for unrelated marketing.</p>

            <h2>Where it is kept and who sees it</h2>
            <ul>
              <li>Enquiries are stored in a secured database run by our hosting provider, Supabase. Only {BRAND} staff with an admin account can read them. Property owners who list with us do not see your details.</li>
              <li>If email alerts are switched on, a copy of the enquiry is sent to our business inbox through an email delivery service.</li>
              <li>We delete enquiries that are closed and no longer needed, and remove spam straight away.</li>
            </ul>

            <h2>Your choices</h2>
            <p>You can ask us to show you, correct or delete the details you sent, or to stop contacting you. Write to us through the <a href="/contact">contact page</a> with the phone number you used, and we will act on it.</p>

            <h2>Changes</h2>
            <p>If this notice changes, the new version will be published on this page.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
