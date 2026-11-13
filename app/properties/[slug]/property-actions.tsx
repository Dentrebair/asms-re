"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { WHATSAPP_NUMBER, enquiriesConnected, sendEnquiry, track } from "@/lib/enquiry";

type Listing = { reference: string; title: string };

const whatsappHref = ({ reference, title }: Listing) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello ASMS-ROUNAQH, I am interested in ${title} (Ref. ${reference}): ${window.location.origin}${window.location.pathname}`)}`;

/** Counts a view once the page has been open and visible for 3 seconds (PRD section 14). */
export function ViewTracker({ reference }: { reference: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => { if (document.visibilityState === "visible" && !timer) timer = setTimeout(() => track("property_view", reference), 3000); };
    const stop = () => { if (document.visibilityState !== "visible" && timer) { clearTimeout(timer); timer = undefined; } };
    start();
    const onChange = () => { stop(); start(); };
    document.addEventListener("visibilitychange", onChange);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onChange); };
  }, [reference]);
  return null;
}

/** Opens a WhatsApp chat with a property-specific message. A click is counted as a click, never as an enquiry. */
export function WhatsAppButton({ listing, className = "btn btn--quiet" }: { listing: Listing; className?: string }) {
  if (!WHATSAPP_NUMBER) return null;
  return (
    <a className={className} href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
      onClick={(e) => { e.currentTarget.href = whatsappHref(listing); track("whatsapp_click", listing.reference); }}>
      WhatsApp us
    </a>
  );
}

/** Shares the page link: the phone's share sheet where there is one, otherwise copies it. */
export function ShareButton({ listing }: { listing: Listing }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href.split(/[?#]/)[0];
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); }
      track("property_shared", listing.reference);
    } catch { /* the visitor closed the share sheet */ }
  }
  return (
    <button type="button" className="link share-link" onClick={share}>
      {copied ? "Link copied" : "Share this property"}
    </button>
  );
}

type Mode = "enquire" | "visit";

/** The enquiry rail on the property page: a short enquiry, or a site visit request (a request, never a booking). */
export function PropertyEnquiry({ listing }: { listing: Listing }) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("enquire");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ mode: Mode; name: string; phone: string } | null>(null);
  const [today, setToday] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the date comes from the visitor's clock, after hydration
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);

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
      kind: mode === "visit" ? "visit" : "property",
      source: "property_page",
      name: value("name"),
      phone: value("phone"),
      email: value("email") || null,
      property_ref: listing.reference,
      interest: listing.title,
      message: value("message") || null,
      preferred_date: mode === "visit" ? value("date") || null : null,
      preferred_time: mode === "visit" ? value("time") || null : null,
      consent: data.get("consent") === "on",
    });
    setBusy(false);
    if (failure) return setError(failure);
    setSent({ mode, name: value("name"), phone: value("phone") });
  }

  if (sent) {
    return (
      <div className="rail-sent" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <h3>{sent.mode === "visit" ? "Visit request sent" : "Enquiry sent"}</h3>
        <p>
          {sent.mode === "visit"
            ? <>Thank you, {sent.name}. This is a request, not a booking: the team will call <strong className="num">{sent.phone}</strong> to agree a time.</>
            : <>Thank you, {sent.name}. The team will call you on <strong className="num">{sent.phone}</strong> about Ref. {listing.reference}.</>}
        </p>
        <button type="button" className="link" onClick={() => setSent(null)}>Send another request</button>
      </div>
    );
  }

  if (!enquiriesConnected) {
    return (
      <div className="rail-actions">
        <a className="btn" href={`/contact?ref=${encodeURIComponent(listing.reference)}`}>Enquire about property</a>
        <a className="btn btn--quiet" href={`/contact?ref=${encodeURIComponent(listing.reference)}&interest=${encodeURIComponent(`${listing.reference} site visit`)}`}>Request a site visit</a>
      </div>
    );
  }

  return (
    <form className="rail-form" onSubmit={submit} noValidate aria-label={mode === "visit" ? "Request a site visit" : "Enquire about this property"} aria-busy={busy}>
      <div className="rail-modes" role="group" aria-label="What would you like to do?">
        <button type="button" aria-pressed={mode === "enquire"} onClick={() => { setMode("enquire"); setError(null); }}>Enquire</button>
        <button type="button" aria-pressed={mode === "visit"} onClick={() => { setMode("visit"); setError(null); }}>Request a visit</button>
      </div>
      <div className="field"><label htmlFor={`${id}-name`}>Full name *</label><input id={`${id}-name`} name="name" autoComplete="name" required maxLength={120} /></div>
      <div className="field"><label htmlFor={`${id}-phone`}>Phone or WhatsApp number *</label><input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="[0-9+() \-]{7,20}" placeholder="+91 00000 00000" /></div>
      <div className="field"><label htmlFor={`${id}-email`}>Email (optional)</label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} /></div>
      {mode === "visit" && (
        <div className="field-row field-row--tight">
          <div className="field"><label htmlFor={`${id}-date`}>Preferred day</label><input id={`${id}-date`} name="date" type="date" min={today || undefined} /></div>
          <div className="field">
            <label htmlFor={`${id}-time`}>Time of day</label>
            <select id={`${id}-time`} name="time" defaultValue=""><option value="">Any time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select>
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor={`${id}-message`}>{mode === "visit" ? "Anything we should know (optional)" : "Your question *"}</label>
        <textarea key={mode} id={`${id}-message`} name="message" rows={3} maxLength={4000} required={mode === "enquire"}
          defaultValue={mode === "enquire" ? `I am interested in ${listing.title} (Ref. ${listing.reference}). Please share more details.` : ""} />
      </div>
      <div className="hp-field" aria-hidden="true"><label htmlFor={`${id}-hp`}>Leave this empty</label><input id={`${id}-hp`} name="company_site" tabIndex={-1} autoComplete="off" /></div>
      <label className="consent"><input type="checkbox" name="consent" required /><span>I agree to be contacted about this request, as described in the <a className="link" href="/privacy">privacy notice</a>.</span></label>
      <button type="submit" className="btn" disabled={busy}>{busy ? "Sending…" : mode === "visit" ? "Send visit request" : "Send enquiry"}</button>
      <p className="form-help" role="status" aria-live="polite" data-tone={error ? "error" : undefined}>{error}</p>
    </form>
  );
}

/** Phone-only bar with the two main actions, kept clear of the content (PRD section 5). */
export function MobileActionBar({ listing }: { listing: Listing }) {
  return (
    <div className="action-bar" role="region" aria-label="Quick actions">
      <a className="btn" href="#enquire">Enquire</a>
      <WhatsAppButton listing={listing} className="btn btn--quiet" />
    </div>
  );
}
