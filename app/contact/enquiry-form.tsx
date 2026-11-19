"use client";

import { FormEvent, useEffect, useState } from "react";
import { ENQUIRY_ENDPOINT, sendEnquiry, type EnquiryKind } from "@/lib/enquiry";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Mail, Phone, Tag, User } from "lucide-react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Selector } from "@astryxdesign/core/Selector";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Banner } from "@astryxdesign/core/Banner";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { checkContact, type FieldErrors } from "../form-checks";

const CATEGORIES: { label: string; kind: EnquiryKind }[] = [
  { label: "Property purchase", kind: "property" },
  { label: "Construction products", kind: "product" },
  { label: "Selling a property", kind: "sell" },
  { label: "Rentals", kind: "general" },
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
  const [f, setF] = useState({ name: "", phone: "", email: "", category: "", interest: "", message: "", consent: false, hp: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [help, setHelp] = useState<{ text: string; tone: "info" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ name: string; phone: string } | null>(null);
  useEffect(() => {
    const pre = readPrefill();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL after hydration
    setPrefill(pre);
    setF((cur) => ({ ...cur, category: pre.category, interest: pre.interest }));
  }, []);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const status = (k: string) => (errors[k] ? { type: "error" as const, message: errors[k] } : undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = checkContact({ ...f, messageRequired: true, extra: { category: f.category ? undefined : "Please choose a category." } });
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      (form.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus();
      setHelp({ text: found[first] ?? "Please complete the required fields.", tone: "error" });
      return;
    }
    if (!form.dataset.endpoint) {
      setHelp({ text: "Nothing was sent: online enquiries are not connected yet. Please call or WhatsApp +91 97897 86467, or email reach@asmsrounaqh.com.", tone: "info" });
      return;
    }
    // Hidden field that people never see; automated spam fills it in.
    if (f.hp) {
      setHelp({ text: "Your enquiry could not be sent. Please contact us by phone or email.", tone: "error" });
      return;
    }
    const kind = CATEGORIES.find((c) => c.label === f.category)?.kind ?? "general";
    const interest = f.interest.trim();
    setBusy(true);
    setHelp({ text: "Sending your enquiry…", tone: "info" });
    const failure = await sendEnquiry({
      kind,
      source: "contact_page",
      name: f.name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim() || null,
      // The reference travels only while the visitor kept the prefilled text.
      property_ref: kind === "property" && prefill.ref && interest.includes(prefill.ref) ? prefill.ref : null,
      product_slug: kind === "product" && prefill.product ? prefill.product : null,
      interest: interest || null,
      message: f.message.trim(),
      consent: f.consent,
    });
    setBusy(false);
    if (failure) return setHelp({ text: failure, tone: "error" });
    setHelp(null);
    setSent({ name: f.name.trim(), phone: f.phone.trim() });
  }

  if (sent) {
    return (
      <div className="enquiry-sent" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <VStack gap={4}>
          <Heading level={2}>Thank you, {sent.name}.</Heading>
          <Text as="p">Your enquiry has reached our team. We will call you on <strong className="num">{sent.phone}</strong>, usually within one working day.</Text>
          <HStack gap={2} wrap="wrap">
            <Button href="/properties" label="Back to properties" />
            <Button label="Send another enquiry" variant="ghost" onClick={() => setSent(null)} />
          </HStack>
        </VStack>
      </div>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={handleSubmit} data-endpoint={ENQUIRY_ENDPOINT} noValidate aria-labelledby="form-title" aria-busy={busy}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2} id="form-title">Tell us what you are looking for.</Heading>
          <Text type="supporting" as="p">Required fields are marked.</Text>
        </VStack>
        <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3}>
          <TextInput label="Full name" htmlName="name" startIcon={User} value={f.name} onChange={(v) => set("name", v)} isRequired autoComplete="name" status={status("name")} />
          <TextInput label="Phone number" htmlName="phone" startIcon={Phone} type="tel" inputMode="tel" value={f.phone} onChange={(v) => set("phone", v)} isRequired autoComplete="tel" placeholder="+91 00000 00000" status={status("phone")} />
          <TextInput label="Email address" htmlName="email" startIcon={Mail} type="email" value={f.email} onChange={(v) => set("email", v)} isOptional autoComplete="email" placeholder="you@example.com" status={status("email")} />
          <Selector label="Enquiry category" htmlName="category" value={f.category} placeholder="Select a category" isRequired
            options={CATEGORIES.map((c) => ({ value: c.label, label: c.label }))} onChange={(v) => set("category", v)} status={status("category")} />
        </Grid>
        <TextInput label="Property or product of interest" htmlName="interest" startIcon={Tag} value={f.interest} onChange={(v) => set("interest", v)} isOptional placeholder="Example: ASMS-CHN-0001 or roofing materials" />
        <TextArea label="How can we help?" htmlName="message" rows={6} maxLength={4000} value={f.message} onChange={(v) => set("message", v)} isRequired
          placeholder="Share your preferred location, budget, product quantity or specification." status={status("message")} />
        <div className="hp-field" aria-hidden="true">
          <label>Leave this empty<input name="company_site" tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set("hp", e.target.value)} /></label>
        </div>
        <VStack gap={1}>
          <CheckboxInput label="I agree to be contacted about this enquiry" htmlName="consent" value={f.consent} onChange={(v) => set("consent", v)} isRequired status={status("consent")} />
          <Text type="supporting" as="p">My details will be handled according to the <Link href="/privacy">privacy notice</Link>, and used only to respond to this enquiry.</Text>
        </VStack>
        <div><Button type="submit" variant="primary" size="lg" isLoading={busy} label={busy ? "Sending…" : "Send enquiry"} /></div>
        <div role="status" aria-live="polite" className="form-help">
          {help && <Banner status={help.tone === "error" ? "error" : "info"} title={help.text} />}
        </div>
      </VStack>
    </form>
  );
}
