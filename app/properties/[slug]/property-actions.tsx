"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Mail, Phone, User } from "lucide-react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Grid } from "@astryxdesign/core/Grid";
import { WHATSAPP_NUMBER, enquiriesConnected, sendEnquiry, track } from "@/lib/enquiry";
import { checkContact, type FieldErrors } from "../../form-checks";

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
export function WhatsAppButton({ listing, variant = "secondary" }: { listing: Listing; variant?: "primary" | "secondary" }) {
  if (!WHATSAPP_NUMBER) return null;
  return (
    <Button label="WhatsApp us" variant={variant} href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
      onClick={(e) => { (e.currentTarget as unknown as HTMLAnchorElement).href = whatsappHref(listing); track("whatsapp_click", listing.reference); }} />
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
  return <Button label={copied ? "Link copied" : "Share this property"} variant="ghost" onClick={share} />;
}

type Mode = "enquire" | "visit";
const TIMES = [{ value: "", label: "Any time" }, { value: "Morning", label: "Morning" }, { value: "Afternoon", label: "Afternoon" }, { value: "Evening", label: "Evening" }];

/** The enquiry rail on the property page: a short enquiry, or a site visit request (a request, never a booking). */
export function PropertyEnquiry({ listing }: { listing: Listing }) {
  const defaultMessage = `I am interested in ${listing.title} (Ref. ${listing.reference}). Please share more details.`;
  const [mode, setMode] = useState<Mode>("enquire");
  const [f, setF] = useState({ name: "", phone: "", email: "", message: defaultMessage, date: "", time: "", consent: false, hp: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ mode: Mode; name: string; phone: string } | null>(null);
  const [today, setToday] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the date comes from the visitor's clock, after hydration
  useEffect(() => setToday(new Date().toLocaleDateString("en-CA")), []);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const status = (k: string) => (errors[k] ? { type: "error" as const, message: errors[k] } : undefined);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setF((cur) => ({ ...cur, message: next === "enquire" ? defaultMessage : "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = checkContact({ ...f, messageRequired: mode === "enquire" });
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      setError(found[first] ?? "Please complete the required fields.");
      (event.currentTarget.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus();
      return;
    }
    if (f.hp) return setError("Your request could not be sent. Please call us instead.");
    setBusy(true);
    setError(null);
    const failure = await sendEnquiry({
      kind: mode === "visit" ? "visit" : "property",
      source: "property_page",
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim() || null,
      property_ref: listing.reference,
      interest: listing.title,
      message: f.message.trim() || null,
      preferred_date: mode === "visit" ? f.date || null : null,
      preferred_time: mode === "visit" ? f.time || null : null,
      consent: f.consent,
    });
    setBusy(false);
    if (failure) return setError(failure);
    setSent({ mode, name: f.name.trim(), phone: f.phone.trim() });
  }

  if (sent) {
    return (
      <div role="status" tabIndex={-1} ref={(el) => el?.focus()} className="rail-sent">
        <VStack gap={3}>
          <Heading level={3}>{sent.mode === "visit" ? "Visit request sent" : "Enquiry sent"}</Heading>
          <Text as="p">
            {sent.mode === "visit"
              ? <>Thank you, {sent.name}. This is a request, not a booking: the team will call <strong className="num">{sent.phone}</strong> to agree a time.</>
              : <>Thank you, {sent.name}. The team will call you on <strong className="num">{sent.phone}</strong> about Ref. {listing.reference}.</>}
          </Text>
          <div><Button label="Send another request" variant="ghost" onClick={() => setSent(null)} /></div>
        </VStack>
      </div>
    );
  }

  if (!enquiriesConnected) {
    return (
      <VStack gap={2}>
        <Button href={`/contact?ref=${encodeURIComponent(listing.reference)}`} label="Enquire about property" variant="primary" width="100%" />
        <Button href={`/contact?ref=${encodeURIComponent(listing.reference)}&interest=${encodeURIComponent(`${listing.reference} site visit`)}`} label="Request a site visit" width="100%" />
      </VStack>
    );
  }

  return (
    <form className="rail-form" onSubmit={submit} noValidate aria-label={mode === "visit" ? "Request a site visit" : "Enquire about this property"} aria-busy={busy}>
      <VStack gap={4}>
        <SegmentedControl label="What would you like to do?" value={mode} onChange={(v) => switchMode(v as Mode)} layout="fill">
          <SegmentedControlItem value="enquire" label="Enquire" />
          <SegmentedControlItem value="visit" label="Request a visit" />
        </SegmentedControl>
        <TextInput label="Full name" htmlName="name" startIcon={User} value={f.name} onChange={(v) => set("name", v)} isRequired autoComplete="name" status={status("name")} />
        <TextInput label="Phone or WhatsApp number" htmlName="phone" startIcon={Phone} type="tel" inputMode="tel" value={f.phone} onChange={(v) => set("phone", v)} isRequired autoComplete="tel" placeholder="+91 00000 00000" status={status("phone")} />
        <TextInput label="Email" htmlName="email" startIcon={Mail} type="email" value={f.email} onChange={(v) => set("email", v)} isOptional autoComplete="email" status={status("email")} />
        {mode === "visit" && (
          <Grid columns={2} gap={3}>
            <DateInput label="Preferred day" value={(f.date || undefined) as ISODateString | undefined} onChange={(v) => set("date", v ?? "")} min={(today || undefined) as ISODateString | undefined} isOptional />
            <Selector label="Time of day" value={f.time} options={TIMES} onChange={(v) => set("time", v)} />
          </Grid>
        )}
        <TextArea label={mode === "visit" ? "Anything we should know" : "Your question"} htmlName="message" rows={3} maxLength={4000}
          value={f.message} onChange={(v) => set("message", v)} isRequired={mode === "enquire"} isOptional={mode === "visit"} status={status("message")} />
        <div className="hp-field" aria-hidden="true">
          <label>Leave this empty<input name="company_site" tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set("hp", e.target.value)} /></label>
        </div>
        <VStack gap={1}>
          <CheckboxInput label="I agree to be contacted about this request" htmlName="consent" value={f.consent} onChange={(v) => set("consent", v)} isRequired status={status("consent")} />
          <Text type="supporting" as="p">As described in the <Link href="/privacy">privacy notice</Link>.</Text>
        </VStack>
        <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} label={busy ? "Sending…" : mode === "visit" ? "Send visit request" : "Send enquiry"} />
        {error && <Banner status="error" title={error} />}
      </VStack>
    </form>
  );
}

/** Phone-only bar with the two main actions, kept clear of the content (PRD section 5). */
export function MobileActionBar({ listing }: { listing: Listing }) {
  return (
    <div className="action-bar" role="region" aria-label="Quick actions">
      <Button href="#enquire" label="Enquire" variant="primary" width="100%" />
      <HStack><WhatsAppButton listing={listing} /></HStack>
    </div>
  );
}
