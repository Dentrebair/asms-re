"use client";

import { FormEvent, useEffect, useState } from "react";
import { ENQUIRY_ENDPOINT, sendEnquiry, type EnquiryKind } from "@/lib/enquiry";

const CATEGORIES: { label: string; kind: EnquiryKind }[] = [
  { label: "Property purchase", kind: "property" },
  { label: "Construction products", kind: "product" },
  { label: "Selling a property", kind: "sell" },
  { label: "General enquiry", kind: "general" },
];

type Prefill = { category: string; interest: string; ref: string; product: string };

// Reads ?category=…&interest=…&ref=…&product=… (set by "Enquire" and "Request
// quote" links) in the browser, so the page can stay a static file.
function readPrefill(): Prefill {
  const params = new URLSearchParams(window.location.search);
  const ref = (params.get("ref") ?? "").slice(0, 60);
  const product = (params.get("product") ?? "").slice(0, 120);
  const interest = (params.get("interest") ?? ref).slice(0, 120);
  const requested = params.get("category") ?? "";
  const category = CATEGORIES.some((c) => c.label === requested) ? requested : product ? "Construction products" : interest ? "Property purchase" : "";
  return { category, interest, ref, product };
}

/**
 * The enquiry form. Sends to the Supabase enquiries table (insert only; the
 * database rules stop visitors reading anything back). Without Supabase
 * configured it says plainly that nothing was sent and never shows success.
 */
export default function EnquiryForm() {
  const [prefill, setPrefill] = useState<Prefill>({ category: "", interest: "", ref: "", product: "" });
  const [help, setHelp] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ name: string; phone: string } | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
  useEffect(() => setPrefill(readPrefill()), []);
  const { category, interest: defaultInterest } = prefill;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    const data = new FormData(form);
    const value = (k: string) => String(data.get(k) ?? "").trim();
    // Hidden field that people never see; automated spam fills it in.
    if (value("company_site")) {
      setHelp({ text: "Your enquiry could not be sent. Please contact us by phone or email.", tone: "error" });
      return;
    }
    const kind = CATEGORIES.find((c) => c.label === value("category"))?.kind ?? "general";
    const interest = value("interest");
    setBusy(true);
    setHelp({ text: "Sending your enquiry…", tone: "info" });
    const failure = await sendEnquiry({
      kind,
      source: "contact_page",
      name: value("name"),
      phone: value("phone"),
      email: value("email") || null,
      // The reference travels only while the visitor kept the prefilled text.
      property_ref: kind === "property" && prefill.ref && interest.includes(prefill.ref) ? prefill.ref : null,
      product_slug: kind === "product" && prefill.product ? prefill.product : null,
      interest: interest || null,
      message: value("message"),
      consent: data.get("consent") === "on",
    });
    setBusy(false);
    if (failure) return setHelp({ text: failure, tone: "error" });
    setHelp(null);
    setSent({ name: value("name"), phone: value("phone") });
  }

  if (sent) {
    return (
      <div className="enquiry-form enquiry-sent" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <h2>Thank you, {sent.name}.</h2>
        <p>Your enquiry has reached our team. We will call you on <strong className="num">{sent.phone}</strong>, usually within one working day.</p>
        <div className="actions">
          <a className="btn btn--quiet" href="/properties">Back to properties</a>
          <button type="button" className="link" onClick={() => setSent(null)}>Send another enquiry</button>
        </div>
      </div>
    );
  }

  return (
    <form key={`${category}|${defaultInterest}`} className="enquiry-form" onSubmit={handleSubmit} data-endpoint={ENQUIRY_ENDPOINT} noValidate aria-labelledby="form-title" aria-busy={busy}>
      <div>
        <h2 id="form-title">Tell us what you are looking for.</h2>
        <p className="form-help">Fields marked with an asterisk are required.</p>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="f-name">Full name *</label><input id="f-name" name="name" type="text" autoComplete="name" required maxLength={120} /></div>
        <div className="field"><label htmlFor="f-phone">Phone number *</label><input id="f-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="[0-9+() \-]{7,20}" placeholder="+91 00000 00000" /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor="f-email">Email address</label><input id="f-email" name="email" type="email" autoComplete="email" maxLength={200} placeholder="you@example.com" /></div>
        <div className="field">
          <label htmlFor="f-category">Enquiry category *</label>
          <select id="f-category" name="category" required defaultValue={category}>
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((c) => <option key={c.label}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="f-interest">Property or product of interest</label><input id="f-interest" name="interest" type="text" maxLength={200} defaultValue={defaultInterest} placeholder="Example: ASMS-PREVIEW-01 or roofing materials" /></div>
      <div className="field"><label htmlFor="f-message">How can we help? *</label><textarea id="f-message" name="message" required maxLength={4000} rows={6} placeholder="Share your preferred location, budget, product quantity or specification." /></div>
      <div className="hp-field" aria-hidden="true"><label htmlFor="f-company-site">Leave this empty</label><input id="f-company-site" name="company_site" type="text" tabIndex={-1} autoComplete="off" /></div>
      <label className="consent"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this enquiry and understand that my details will be handled according to the <a className="link" href="/privacy">privacy notice</a>.</span></label>
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send enquiry"}</button>
        <small>We use your information only to respond to this enquiry.</small>
      </div>
      <p className="form-help" role="status" aria-live="polite" data-tone={help?.tone}>{help?.text}</p>
    </form>
  );
}
