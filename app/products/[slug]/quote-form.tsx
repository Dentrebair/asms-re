"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Boxes, Building2, Mail, Phone, Truck, User } from "lucide-react";
import { TextArea } from "@astryxdesign/core/TextArea";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Banner } from "@astryxdesign/core/Banner";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { enquiriesConnected, sendEnquiry } from "@/lib/enquiry";
import { checkContact, type FieldErrors } from "../../form-checks";

/** Quote request for one product (PRD section 13). Saved as a Product enquiry, separate from property leads. */
export default function QuoteForm({ slug, name }: { slug: string; name: string }) {
  const [f, setF] = useState({ name: "", organisation: "", phone: "", email: "", quantity: "", location: "", message: "", consent: false, hp: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; phone: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((cur) => ({ ...cur, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const status = (k: string) => (errors[k] ? { type: "error" as const, message: errors[k] } : undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = checkContact({ ...f, extra: {
      quantity: f.quantity.trim() ? undefined : "Please give an approximate quantity and unit.",
      location: f.location.trim() ? undefined : "Please give the delivery location.",
    } });
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
      kind: "product",
      source: "product_page",
      name: f.name.trim(),
      organisation: f.organisation.trim() || null,
      phone: f.phone.trim(),
      email: f.email.trim() || null,
      product_slug: slug,
      interest: name,
      quantity: f.quantity.trim() || null,
      delivery_location: f.location.trim() || null,
      message: f.message.trim() || `Please send a quote for ${name}.`,
      consent: f.consent,
    });
    setBusy(false);
    if (failure) return setError(failure);
    setSent({ name: f.name.trim(), phone: f.phone.trim() });
  }

  if (sent) {
    return (
      <div className="enquiry-sent" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <VStack gap={3}>
          <Heading level={2}>Quote request sent</Heading>
          <Text as="p">Thank you, {sent.name}. The team will call <strong className="num">{sent.phone}</strong> with pricing, taxes, delivery and lead time for {name}.</Text>
          <div><Button href="/products" label="Back to products" /></div>
        </VStack>
      </div>
    );
  }

  if (!enquiriesConnected) {
    return (
      <VStack gap={3}>
        <Heading level={2}>Request a quote</Heading>
        <Text as="p">Online quote requests are not connected yet.</Text>
        <div><Button href={`/contact?product=${encodeURIComponent(slug)}&interest=${encodeURIComponent(name)}`} label="Send your requirement" variant="primary" /></div>
      </VStack>
    );
  }

  return (
    <form className="enquiry-form" onSubmit={submit} noValidate aria-labelledby="quote-form-title" aria-busy={busy}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={2} id="quote-form-title">Request a quote</Heading>
          <Text type="supporting" as="p">Quantity and delivery location give you the most useful answer.</Text>
        </VStack>
        <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3}>
          <TextInput label="Full name" htmlName="name" startIcon={User} value={f.name} onChange={(v) => set("name", v)} isRequired autoComplete="name" status={status("name")} />
          <TextInput label="Organisation" htmlName="organisation" startIcon={Building2} value={f.organisation} onChange={(v) => set("organisation", v)} isOptional autoComplete="organization" />
          <TextInput label="Phone number" htmlName="phone" startIcon={Phone} type="tel" inputMode="tel" value={f.phone} onChange={(v) => set("phone", v)} isRequired autoComplete="tel" placeholder="+91 00000 00000" status={status("phone")} />
          <TextInput label="Email address" htmlName="email" startIcon={Mail} type="email" value={f.email} onChange={(v) => set("email", v)} isOptional autoComplete="email" status={status("email")} />
          <TextInput label="Quantity" htmlName="quantity" startIcon={Boxes} value={f.quantity} onChange={(v) => set("quantity", v)} isRequired placeholder="Amount and unit, e.g. 10 tonnes" status={status("quantity")} />
          <TextInput label="Delivery location" htmlName="location" startIcon={Truck} value={f.location} onChange={(v) => set("location", v)} isRequired placeholder="e.g. Tambaram, Chennai" status={status("location")} />
        </Grid>
        <TextArea label="Specification or notes" htmlName="message" rows={4} maxLength={4000} value={f.message} onChange={(v) => set("message", v)} isOptional placeholder="Grade, size, brand preference, date needed on site." />
        <div className="hp-field" aria-hidden="true">
          <label>Leave this empty<input name="company_site" tabIndex={-1} autoComplete="off" value={f.hp} onChange={(e) => set("hp", e.target.value)} /></label>
        </div>
        <VStack gap={1}>
          <CheckboxInput label="I agree to be contacted about this quote" htmlName="consent" value={f.consent} onChange={(v) => set("consent", v)} isRequired status={status("consent")} />
          <Text type="supporting" as="p">As described in the <Link href="/privacy">privacy notice</Link>.</Text>
        </VStack>
        <div><Button type="submit" variant="primary" size="lg" isLoading={busy} label={busy ? "Sending…" : "Request quote"} /></div>
        {error && <Banner status="error" title={error} />}
      </VStack>
    </form>
  );
}
