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

/**
 * The enquiry form. It validates in the browser but has no endpoint yet
 * (data-endpoint is empty), so it says plainly that nothing was sent and never
 * shows a success message. Set data-endpoint once delivery is connected.
 */
export default function EnquiryForm() {
  const [prefill, setPrefill] = useState<Prefill>({ category: "", interest: "" });
  const [help, setHelp] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
  useEffect(() => setPrefill(readPrefill()), []);
  const { category, interest: defaultInterest } = prefill;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalid = [...form.elements].find((el): el is HTMLInputElement => "checkValidity" in el && !(el as HTMLInputElement).checkValidity());
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
      setHelp({ text: invalid.validationMessage || "Please complete the required fields.", tone: "error" });
      return;
    }
    if (!form.dataset.endpoint) {
      setHelp({ text: "Nothing was sent: online enquiries are not connected yet. Please contact us by phone or email once those details are published.", tone: "info" });
      return;
    }
  }

  return (
    <form key={`${category}|${defaultInterest}`} className="enquiry-form" onSubmit={handleSubmit} data-endpoint="" noValidate aria-labelledby="form-title">
      <div>
        <h2 id="form-title">Tell us what you are looking for.</h2>
        <p className="form-help">Fields marked with an asterisk are required.</p>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="f-name">Full name *</label><input id="f-name" name="name" type="text" autoComplete="name" required /></div>
        <div className="field"><label htmlFor="f-phone">Phone number *</label><input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="+91 00000 00000" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="f-email">Email address</label><input id="f-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" /></div>
        <div className="field">
          <label htmlFor="f-category">Enquiry category *</label>
          <select id="f-category" name="category" required defaultValue={category}>
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="f-interest">Property or product of interest</label><input id="f-interest" name="interest" type="text" defaultValue={defaultInterest} placeholder="Example: ASMS-PREVIEW-01 or roofing materials" /></div>
      <div className="field"><label htmlFor="f-message">How can we help? *</label><textarea id="f-message" name="message" required rows={6} placeholder="Share your preferred location, budget, product quantity or specification." /></div>
      <label className="consent"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this enquiry and understand that my details will be handled according to the privacy notice.</span></label>
      <div className="actions">
        <button className="btn" type="submit">Send enquiry</button>
        <small>We use your information only to respond to this enquiry.</small>
      </div>
      <p className="form-help" role="status" aria-live="polite" data-tone={help?.tone}>{help?.text}</p>
    </form>
  );
}
