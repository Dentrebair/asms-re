"use client";

import { FormEvent, useEffect, useState } from "react";

const CATEGORIES = ["Property purchase", "Construction products", "General enquiry"];

type Prefill = { category: string; interest: string };

// Reads ?category=…&interest=… (set by "Request quote" / "Enquire" links) in the
// browser, so the page can stay a static file.
function readPrefill(): Prefill {
  const params = new URLSearchParams(window.location.search);
  const interest = params.get("interest")?.slice(0, 120) ?? "";
  const requested = params.get("category") ?? "";
  const category = CATEGORIES.includes(requested) ? requested : interest ? "Property purchase" : "";
  return { category, interest };
}

export default function EnquiryForm() {
  const [prefill, setPrefill] = useState<Prefill>({ category: "", interest: "" });
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
  useEffect(() => setPrefill(readPrefill()), []);
  const { category, interest: defaultInterest } = prefill;
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  }

  if (submitted) {
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span aria-hidden="true">✓</span>
        <h2>Thank you for your enquiry.</h2>
        <p>Your details have been captured in this design preview. Production delivery will be connected to the verified ASMS–ROUNAQH business email before launch.</p>
        <button type="button" onClick={() => setSubmitted(false)}>Send another enquiry</button>
      </div>
    );
  }

  return (
    <form key={`${category}|${defaultInterest}`} className="enquiry-form" onSubmit={handleSubmit}>
      <div className="form-intro">
        <span>Enquiry form</span>
        <h2>Tell us what you are looking for.</h2>
        <p>Fields marked with an asterisk are required.</p>
      </div>
      <div className="field-row">
        <label><span>Full name *</span><input name="name" type="text" autoComplete="name" required placeholder="Your name" /></label>
        <label><span>Phone number *</span><input name="phone" type="tel" autoComplete="tel" required placeholder="+91 00000 00000" /></label>
      </div>
      <div className="field-row">
        <label><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label>
        <label><span>Enquiry category *</span><select name="category" required defaultValue={category}><option value="" disabled>Select a category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label><span>Property or product of interest</span><input name="interest" type="text" defaultValue={defaultInterest} placeholder="Example: ASMS-PREVIEW-01 or roofing materials" /></label>
      <label><span>How can we help? *</span><textarea name="message" required rows={6} placeholder="Share your preferred location, budget, product quantity or specification." /></label>
      <label className="consent-field"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this enquiry and understand that my details will be handled according to the privacy notice.</span></label>
      <div className="form-submit-row">
        <button className="button button-green" type="submit">Submit enquiry <span aria-hidden="true">→</span></button>
        <small>We use your information only to respond to this enquiry.</small>
      </div>
    </form>
  );
}
