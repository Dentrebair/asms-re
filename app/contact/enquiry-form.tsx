"use client";

import { FormEvent, useState } from "react";

export default function EnquiryForm() {
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
    <form className="enquiry-form" onSubmit={handleSubmit}>
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
        <label><span>Enquiry category *</span><select name="category" required defaultValue=""><option value="" disabled>Select a category</option><option>Property purchase</option><option>Construction products</option><option>General enquiry</option></select></label>
      </div>
      <label><span>Property or product of interest</span><input name="interest" type="text" placeholder="Example: ASMS-PREVIEW-01 or roofing materials" /></label>
      <label><span>How can we help? *</span><textarea name="message" required rows={6} placeholder="Share your preferred location, budget, product quantity or specification." /></label>
      <label className="consent-field"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this enquiry and understand that my details will be handled according to the privacy notice.</span></label>
      <div className="form-submit-row">
        <button className="button button-green" type="submit">Submit enquiry <span aria-hidden="true">→</span></button>
        <small>We use your information only to respond to this enquiry.</small>
      </div>
    </form>
  );
}
