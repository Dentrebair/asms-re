import { BRAND, Footer, Header } from "../site-components";

export const dynamic = "force-static";

export const metadata = {
  title: "Privacy notice | ASMS‑ROUNAQH",
  description: "How ASMS‑ROUNAQH handles the details you send through the website enquiry form.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="page-head" aria-labelledby="page-title">
          <div className="container page-head-grid">
            <h1 id="page-title">Privacy notice</h1>
            <p className="lead">What happens to the details you send us through this website.</p>
          </div>
        </section>

        <section className="sec sec--list" aria-label="Privacy notice">
          <div className="container prose">
            <h2>What we collect</h2>
            <p>When you send an enquiry we receive your name, phone number, the category and the property or product you ask about, your message, and your email address if you give one. Browsing the site does not ask you for any personal details, and we do not use advertising or tracking cookies.</p>

            <h2>Why we use it</h2>
            <p>Only to reply to your enquiry: to call or write to you, share property documents or a product quotation, and arrange a site visit if you ask for one. We do not sell your details or use them for unrelated marketing.</p>

            <h2>Where it is kept and who sees it</h2>
            <ul>
              <li>Enquiries are stored in a secured database run by our hosting provider, Supabase. Only {BRAND} staff with an admin account can read them.</li>
              <li>If email alerts are switched on, a copy of the enquiry is sent to our business inbox through an email delivery service.</li>
              <li>We delete enquiries that are closed and no longer needed, and remove spam straight away.</li>
            </ul>

            <h2>Your choices</h2>
            <p>You can ask us to show you, correct or delete the details you sent, or to stop contacting you. Write to us through the <a className="link" href="/contact">contact page</a> with the phone number you used, and we will act on it.</p>

            <h2>Changes</h2>
            <p>If this notice changes, the new version will be published on this page.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
