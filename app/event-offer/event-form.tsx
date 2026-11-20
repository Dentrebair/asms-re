"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Briefcase, Check, Copy, User } from "lucide-react";
import { EVENT, eventPhase, registerForEvent, trackEvent, type RegistrationSource } from "@/lib/event";

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

const istDay = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
/** "tonight at 11:59 PM IST" on the closing day, otherwise "21 Nov, 11:59 PM IST". */
export const closingLine = (now: number) => (istDay(now) === istDay(EVENT.closesAt) ? "tonight at 11:59 PM IST" : "21 Nov, 11:59 PM IST");

const split = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};
const two = (n: number) => String(n).padStart(2, "0");

/** One line of countdown, for the popup and the form. */
export function EventCountdown({ now }: { now: number | null }) {
  if (now === null) return <Text type="supporting" as="p">Offer ends 21 Nov, 11:59 PM IST</Text>;
  const phase = eventPhase(now);
  if (phase === "closed") return <Text type="supporting" as="p">This offer closed on 21 Nov at 11:59 PM IST.</Text>;
  const t = split((phase === "before" ? EVENT.opensAt : EVENT.closesAt) - now);
  const left = `${t.d ? `${t.d}d ` : ""}${t.h}h ${two(t.m)}m ${two(t.s)}s`;
  if (phase === "before") return <Text type="supporting" as="p" className="num">Registration opens soon · in {left}</Text>;
  return <Text type="supporting" as="p" className="num"><strong>Ends {closingLine(now)}</strong> · {left} left</Text>;
}

/** The page's large countdown: days, hours, minutes, seconds. */
export function BigCountdown() {
  const now = useNow();
  const phase = now === null ? "open" : eventPhase(now);
  if (phase === "closed") return <p className="event-ended">This offer has ended. Thank you for your interest.</p>;
  const t = split(now === null ? 0 : (phase === "before" ? EVENT.opensAt : EVENT.closesAt) - now);
  const units: [string, string][] = [...(t.d ? [[String(t.d), t.d === 1 ? "day" : "days"] as [string, string]] : []), [two(t.h), "hours"], [two(t.m), "minutes"], [two(t.s), "seconds"]];
  return (
    <div className="event-countdown" role="timer" aria-live="off">
      <p className="event-countdown-label">{phase === "before" ? "Registration opens in" : now !== null ? `Offer ends ${closingLine(now)}` : "Offer ends 21 Nov, 11:59 PM IST"}</p>
      <div className="event-countdown-units">
        {units.map(([n, l]) => <div key={l}><span className="num">{now === null ? "--" : n}</span><small>{l}</small></div>)}
      </div>
    </div>
  );
}

/** Name, company and WhatsApp number: register in under a minute, no sign-in. */
export default function EventForm({ source, onRegistered, showCountdown = true }: { source: RegistrationSource; onRegistered?: () => void; showCountdown?: boolean }) {
  const now = useNow();
  const [f, setF] = useState({ name: "", company: "", whatsapp: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  async function copy() {
    try { await navigator.clipboard.writeText(code ?? ""); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the ID stays on screen */ }
  }

  if (code) {
    return (
      <div className="event-done" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <VStack gap={3}>
          <span className="event-done-tick" aria-hidden="true"><Check size={22} /></span>
          <Heading level={3}>Registration successful!</Heading>
          <Text as="p">Your offer has been registered. Your claim reference:</Text>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <p className="event-code num">{code}</p>
            <Button size="sm" label={copied ? "Copied" : "Copy"} icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copy()} />
          </HStack>
          <Text as="p">Save this reference (a screenshot is fine) to claim your commission discount on an eligible transaction.</Text>
          <div><Button href="/properties" variant="primary" label="Explore ASMS properties" /></div>
        </VStack>
      </div>
    );
  }

  const phase = now === null ? "open" : eventPhase(now);
  const off = phase !== "open";
  return (
    <form className="event-form" onSubmit={submit} noValidate aria-busy={busy} aria-label="Register for the event offer">
      <VStack gap={3}>
        {showCountdown && <EventCountdown now={now} />}
        <TextInput label="Full name" htmlName="name" startIcon={User} value={f.name} onChange={(v) => set("name", v ?? "")} placeholder="Enter your name"
          isRequired autoComplete="name" isDisabled={off} status={errors.name ? { type: "error", message: errors.name } : undefined} />
        <TextInput label="Company / business name" htmlName="company" startIcon={Briefcase} value={f.company} onChange={(v) => set("company", v ?? "")} placeholder="Enter business name"
          isOptional autoComplete="organization" isDisabled={off} />
        <TextInput label="WhatsApp number" htmlName="whatsapp" startIcon={<span className="event-prefix" aria-hidden="true">+91</span>} type="tel" inputMode="tel" value={f.whatsapp}
          onChange={(v) => set("whatsapp", v ?? "")} placeholder="Enter mobile number" isRequired autoComplete="tel-national" isDisabled={off}
          status={errors.whatsapp ? { type: "error", message: errors.whatsapp } : undefined} />
        <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} isDisabled={off}
          label={phase === "closed" ? "Offer closed" : phase === "before" ? "Opens soon" : busy ? "Registering…" : "Claim my 25% discount"} />
        <div role="status" aria-live="polite">{problem && <Banner status="error" title={problem} />}</div>
        <Text type="supporting" as="p" className="event-fine">
          No payment required to register. The offer applies to ASMS brokerage commission, not property prices; transaction eligibility and redemption <Link href={`${EVENT.path}#terms`}>terms</Link> apply.
          Your details are used only for this offer, with no promotional WhatsApp messages (<Link href="/privacy">privacy notice</Link>).
        </Text>
      </VStack>
    </form>
  );
}
