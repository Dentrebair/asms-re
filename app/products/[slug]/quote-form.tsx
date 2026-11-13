"use client";

import { useId, useState, type FormEvent } from "react";
import { enquiriesConnected, sendEnquiry } from "@/lib/enquiry";

/** Quote request for one product (PRD section 13). Saved as a Product enquiry, separate from property leads. */
export default function QuoteForm({ slug, name }: { slug: string; name: string }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; phone: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalid = [...form.elements].find((el): el is HTMLInputElement => "checkValidity" in el && !(el as HTMLInputElement).checkValidity());
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (invalid) {
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
      return setError(invalid.validationMessage || "Please complete the required fields.");
    }
    const data = new FormData(form);
    const value = (k: string) => String(data.get(k) ?? "").trim();
    if (value("company_site")) return setError("Your request could not be sent. Please call us instead.");
    setBusy(true);
    setError(null);
    const failure = await sendEnquiry({
      kind: "product",
      source: "product_page",
      name: value("name"),
      organisation: value("organisation") || null,
      phone: value("phone"),
      email: value("email") || null,
      product_slug: slug,
      interest: name,
      quantity: value("quantity") || null,
      delivery_location: value("location") || null,
      message: value("message") || `Please send a quote for ${name}.`,
      consent: data.get("consent") === "on",
    });
    setBusy(false);
    if (failure) return setError(failure);
    setSent({ name: value("name"), phone: value("phone") });
  }

  if (sent) {
    return (
      <div className="enquiry-form enquiry-sent" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <h2>Quote request sent</h2>
        <p>Thank you, {sent.name}. The team will call <strong className="num">{sent.phone}</strong> with pricing, taxes, delivery and lead time for {name}.</p>
        <div className="actions"><a className="btn btn--quiet" href="/products">Back to products</a></div>
      </div>
    );
  }

  if (!enquiriesConnected) {
    return (
      <div className="enquiry-form">
        <h2>Request a quote</h2>
        <p>Online quote requests are not connected yet.</p>
        <div className="actions"><a className="btn" href={`/contact?product=${encodeURIComponent(slug)}&interest=${encodeURIComponent(name)}`}>Send your requirement</a></div>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={submit} noValidate aria-labelledby={`${id}-title`} aria-busy={busy}>
      <div>
        <h2 id={`${id}-title`}>Request a quote</h2>
        <p className="form-help">Quantity and delivery location give you the most useful answer. Fields marked with an asterisk are required.</p>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor={`${id}-name`}>Full name *</label><input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} /></div>
        <div className="field"><label htmlFor={`${id}-org`}>Organisation</label><input id={`${id}-org`} name="organisation" autoComplete="organization" maxLength={120} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor={`${id}-phone`}>Phone number *</label><input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="[0-9+() \-]{7,20}" placeholder="+91 00000 00000" /></div>
        <div className="field"><label htmlFor={`${id}-email`}>Email address</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label htmlFor={`${id}-qty`}>Quantity *</label><input id={`${id}-qty`} name="quantity" required maxLength={120} placeholder="Amount and unit, e.g. 10 tonnes" /></div>
        <div className="field"><label htmlFor={`${id}-loc`}>Delivery location *</label><input id={`${id}-loc`} name="location" required maxLength={160} placeholder="e.g. Tambaram, Chennai" /></div>
      </div>
      <div className="field"><label htmlFor={`${id}-msg`}>Specification or notes</label><textarea id={`${id}-msg`} name="message" rows={4} maxLength={4000} placeholder="Grade, size, brand preference, date needed on site." /></div>
      <div className="hp-field" aria-hidden="true"><label htmlFor={`${id}-hp`}>Leave this empty</label><input id={`${id}-hp`} name="company_site" tabIndex={-1} autoComplete="off" /></div>
      <label className="consent"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this quote, as described in the <a className="link" href="/privacy">privacy notice</a>.</span></label>
      <div className="actions"><button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Request quote"}</button></div>
      <p className="form-help" role="status" aria-live="polite" data-tone={error ? "error" : undefined}>{error}</p>
    </form>
  );
}
