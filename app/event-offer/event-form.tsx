"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { Briefcase, Phone, User } from "lucide-react";
import { EVENT, countdown, eventPhase, registerForEvent, trackEvent, type RegistrationSource } from "@/lib/event";

const STORE = `asms-event-${EVENT.slug}`;
const remembered = () => { try { return localStorage.getItem(STORE); } catch { return null; } };

/** Ticks once a second; null until mounted so the static HTML never shows a stale time. */
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function EventCountdown({ now }: { now: number | null }) {
  if (now === null) return <Text type="supporting" as="p">Offer closes 21 Nov · 11:59 PM IST</Text>;
  const phase = eventPhase(now);
  if (phase === "closed") return <Text type="supporting" as="p">This offer closed on 21 Nov at 11:59 PM IST.</Text>;
  if (phase === "before") return <Text type="supporting" as="p" className="num">Registration opens 21 Nov, 12:00 AM IST · in {countdown(EVENT.opensAt - now)}</Text>;
  return <Text type="supporting" as="p" className="num"><strong>Offer closes in {countdown(EVENT.closesAt - now)}</strong> · 21 Nov, 11:59 PM IST</Text>;
}

/** Name, company and WhatsApp number: register in under 20 seconds, no sign-in. */
export default function EventForm({ source, onRegistered }: { source: RegistrationSource; onRegistered?: () => void }) {
  const now = useNow();
  const [f, setF] = useState({ name: "", company: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const saved = remembered();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of this browser's earlier registration
    if (saved) setCode(saved);
  }, []);

  const set = (k: keyof typeof f, v: string) => {
    if (!started.current) { started.current = true; trackEvent("form_start"); }
    setF((cur) => ({ ...cur, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (f.name.trim().length < 2) found.name = "Please enter your full name.";
    const digits = f.whatsapp.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) found.whatsapp = "Please enter a 10-digit mobile number.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setProblem(null);
    const result = await registerForEvent(f.name, f.company, digits, source);
    setBusy(false);
    if ("error" in result) return setProblem(result.error);
    try { localStorage.setItem(STORE, result.code); } catch { /* the code is still shown */ }
    setCode(result.code);
    onRegistered?.();
  }

  if (code) {
    return (
      <div className="event-done" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <VStack gap={3}>
          <Heading level={3}>You’re registered</Heading>
          <Text as="p">Your registration ID is</Text>
          <p className="event-code num">{code}</p>
          <Text as="p">Keep this ID (a screenshot is fine). Quote it when you buy or sell through ASMS‑ROUNAQH to claim 25% off our brokerage commission, subject to the <Link href={`${EVENT.path}#terms`}>offer terms</Link>.</Text>
        </VStack>
      </div>
    );
  }

  const phase = now === null ? "open" : eventPhase(now);
  return (
    <form className="event-form" onSubmit={submit} noValidate aria-busy={busy} aria-label="Register for the event offer">
      <VStack gap={3}>
        <EventCountdown now={now} />
        <TextInput label="Your full name" htmlName="name" startIcon={User} value={f.name} onChange={(v) => set("name", v ?? "")}
          isRequired autoComplete="name" isDisabled={phase !== "open"} status={errors.name ? { type: "error", message: errors.name } : undefined} />
        <TextInput label="Company / business name" htmlName="company" startIcon={Briefcase} value={f.company} onChange={(v) => set("company", v ?? "")}
          isOptional autoComplete="organization" isDisabled={phase !== "open"} />
        <TextInput label="WhatsApp number (+91)" htmlName="whatsapp" startIcon={Phone} type="tel" inputMode="tel" value={f.whatsapp} onChange={(v) => set("whatsapp", v ?? "")}
          isRequired autoComplete="tel-national" placeholder="98400 12345" isDisabled={phase !== "open"} status={errors.whatsapp ? { type: "error", message: errors.whatsapp } : undefined} />
        <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} isDisabled={phase !== "open"}
          label={phase === "closed" ? "Offer closed" : phase === "before" ? "Opens 21 Nov" : busy ? "Registering…" : "Claim my 25% discount"} />
        <div role="status" aria-live="polite">{problem && <Banner status="error" title={problem} />}</div>
        <Text type="supporting" as="p">
          We use these details only to record your offer and to contact you about it. No promotional WhatsApp messages unless you ask.{" "}
          <Link href={`${EVENT.path}#terms`}>Offer terms</Link> · <Link href="/privacy">Privacy notice</Link>
        </Text>
      </VStack>
    </form>
  );
}
