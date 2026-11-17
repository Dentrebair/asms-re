"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Spinner } from "@astryxdesign/core/Spinner";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Building2, ExternalLink, LogOut, Phone, Plus, UserRound } from "lucide-react";
import { formatINRShort } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import {
  SELLER_TYPES, deletePhotos, emptyProperty, explain, isConfigured, mediaUrl, supabase,
  type HistoryRow, type PropertyRow, type RevisionRow, type SellerProfile, type SellerType,
} from "../admin/lib";
import { SELLER_STAGE_NOTE, STAGE_LABEL, formatDate, historyLine, stageTone } from "../admin/stages";
import { SectionHeader, StatCards, Thumb, Toast } from "../admin/ui";
import { ListingWizard } from "./listing-wizard";

type Notify = (message: string, tone?: "ok" | "error") => void;
type AuthState = "loading" | "signed-out" | "onboarding" | "ready";
type View = { kind: "listings" } | { kind: "edit"; listing: PropertyRow; isNew: boolean } | { kind: "profile" };

const STALE_DAYS = 30;
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : Infinity);

/**
 * The seller portal (PRD sections 9 to 11): sign in with Google, say who you are once,
 * then list properties. Nothing a seller writes reaches the website until staff approve it.
 */
export default function SellerApp() {
  const [state, setState] = useState<AuthState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [view, setView] = useState<View>({ kind: "listings" });
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const notify = useCallback<Notify>((message, tone = "ok") => setToast({ message, tone }), []);

  const resolve = useCallback(async (s: Session | null) => {
    setSession(s);
    if (!s) return setState("signed-out");
    const { data, error } = await supabase().from("seller_profiles").select("*").eq("user_id", s.user.id).maybeSingle();
    if (error) notify(explain(error), "error");
    setProfile(data as SellerProfile | null);
    setState(data ? "ready" : "onboarding");
  }, [notify]);

  useEffect(() => {
    if (!isConfigured) return;
    const { data: sub } = supabase().auth.onAuthStateChange((event, s) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT"].includes(event)) return;
      setTimeout(() => void resolve(event === "SIGNED_OUT" ? null : s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  useEffect(() => {
    if (toast?.tone !== "ok") return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const toastEl = <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />;

  if (!isConfigured) {
    return <div className="adm"><div className="adm-card"><Card padding={8}><VStack gap={3}><Heading level={1}>Seller portal not connected</Heading><Text as="p">Set the Supabase settings for the build. See <code>supabase/README.md</code>.</Text></VStack></Card></div></div>;
  }
  if (state === "loading") return <div className="adm"><div className="adm-center"><Spinner label="Loading" /></div></div>;
  if (state === "signed-out") return <div className="adm"><SignIn notify={notify} />{toastEl}</div>;
  if (state === "onboarding" || !profile) {
    return <div className="adm"><Onboarding session={session!} notify={notify} onDone={(p) => { setProfile(p); setToast(null); setState("ready"); }} />{toastEl}</div>;
  }

  const signOut = () => supabase().auth.signOut();
  return (
    <div className="adm adm-portal sel">
      <AppShell
        variant="elevated"
        topNav={
          <div className="adm-header">
            <TopNav
              label="Seller portal"
              heading={
                <TopNavHeading
                  // eslint-disable-next-line @next/next/no-img-element -- static export
                  logo={<img src="/icon.png" alt="" width={30} height={30} className="adm-logo" />}
                  heading="ASMS–ROUNAQH"
                  headingHref="/seller"
                  headerEndContent={<span className="only-wide"><Badge label="Seller portal" variant="info" /></span>}
                />
              }
              endContent={
                <HStack gap={2} vAlign="center">
                  <span className="only-wide"><Button variant="ghost" label="My listings" icon={<Building2 size={16} />} onClick={() => setView({ kind: "listings" })} /></span>
                  <span className="only-wide"><Button variant="ghost" label="Your details" icon={<UserRound size={16} />} onClick={() => setView({ kind: "profile" })} /></span>
                  <span className="only-narrow"><IconButton variant="ghost" label="Your details" icon={<UserRound size={16} />} onClick={() => setView({ kind: "profile" })} /></span>
                  <span className="only-wide"><Button variant="ghost" label="Sign out" icon={<LogOut size={16} />} onClick={signOut} /></span>
                  <span className="only-narrow"><IconButton variant="ghost" label="Sign out" icon={<LogOut size={16} />} onClick={signOut} /></span>
                </HStack>
              }
            />
          </div>
        }>
        <main className="adm-main" data-section={view.kind}>
          {profile.status === "suspended" && (
            <div className="sel-note"><Banner status="error" title="Your seller account is suspended" description={`You can see your listings but not add or change them. Call ${COMPANY.phone} if you think this is a mistake.`} /></div>
          )}
          {view.kind === "listings" && <Listings profile={profile} notify={notify} onEdit={(listing, isNew) => setView({ kind: "edit", listing, isNew })} />}
          {view.kind === "edit" && <ListingWizard initial={view.listing} isNew={view.isNew} profile={profile} notify={notify} onDone={() => setView({ kind: "listings" })} />}
          {view.kind === "profile" && <ProfileForm profile={profile} notify={notify} onSaved={(p) => { setProfile(p); setView({ kind: "listings" }); }} />}
        </main>
      </AppShell>
      {toastEl}
    </div>
  );
}

// ------------------------------------------------------------------ sign in --
function SignIn({ notify }: { notify: Notify }) {
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true);
    const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/seller` } });
    if (error) { setBusy(false); notify(explain(error), "error"); }
  }
  return (
    <div className="adm-card sel-signin">
      <Card padding={8} elevation="high">
        <VStack gap={5}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img className="adm-brand-mark" src="/brand/logo-script.webp" alt="ASMS-ROUNAQH" width={260} height={160} />
          <VStack gap={2}>
            <Heading level={1}>List your property</Heading>
            <Text color="secondary" as="p">Homes, plots, commercial space and agricultural land in and around Chennai. Every listing is checked by our team before buyers see it.</Text>
          </VStack>
          <Button variant="primary" size="lg" width="100%" isLoading={busy} onClick={() => void google()} icon={<GoogleMark />} label={busy ? "Opening Google…" : "Continue with Google"} />
          <Text type="supporting" as="p">We use your Google account only to sign you in. Buyers never see your email address. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></Text>
          <Text type="supporting" as="p">Prefer to talk? <a href="/sell">Ask for a callback</a> or call <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>.</Text>
        </VStack>
      </Card>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// --------------------------------------------------------------- onboarding --
function ProfileFields({ name, setName, phone, setPhone, type, setType, company, setCompany }: {
  name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void;
  type: SellerType; setType: (v: SellerType) => void; company: string; setCompany: (v: string) => void;
}) {
  return (
    <>
      <RadioList label="Who are you?" description="This helps our reviewers. Buyers don’t see it." value={type} onChange={(v) => setType(v as SellerType)} isRequired>
        {SELLER_TYPES.map((t) => <RadioListItem key={t.value} value={t.value} label={t.label} description={t.description} />)}
      </RadioList>
      <TextInput label="Your name" value={name} onChange={setName} isRequired autoComplete="name" startIcon={UserRound} />
      <TextInput label="Mobile number" type="tel" value={phone} onChange={setPhone} isRequired autoComplete="tel" startIcon={Phone} description="Our team calls this number about your listings. Buyers don’t see it." />
      {(type === "broker" || type === "developer") && <TextInput label="Company or firm" value={company} onChange={setCompany} startIcon={Building2} />}
    </>
  );
}

const validPhone = (v: string) => /^[0-9+() -]{7,20}$/.test(v.trim());

function Onboarding({ session, notify, onDone }: { session: Session; notify: Notify; onDone: (p: SellerProfile) => void }) {
  const meta = session.user.user_metadata as { full_name?: string; name?: string } | undefined;
  const [name, setName] = useState(meta?.full_name ?? meta?.name ?? "");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<SellerType>("owner");
  const [company, setCompany] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return notify("Enter your name.", "error");
    if (!validPhone(phone)) return notify("Enter a mobile number, for example 98400 12345.", "error");
    if (!agreed) return notify("Please accept the terms to continue.", "error");
    setBusy(true);
    const row = { user_id: session.user.id, email: (session.user.email ?? "").toLowerCase(), name: name.trim(), phone: phone.trim(), seller_type: type, company: company.trim() || null };
    const { error } = await supabase().from("seller_profiles").insert(row);
    setBusy(false);
    if (error) return notify(explain(error), "error");
    onDone({ ...row, status: "active" });
  }

  return (
    <form className="adm-card sel-onboard" onSubmit={submit}>
      <Card padding={8} elevation="high">
        <VStack gap={5}>
          <VStack gap={2}>
            <Heading level={1}>About you</Heading>
            <Text color="secondary" as="p">Signed in as {session.user.email}. Tell us who you are once; you can change it later.</Text>
          </VStack>
          <ProfileFields {...{ name, setName, phone, setPhone, type, setType, company, setCompany }} />
          <CheckboxInput value={agreed} onChange={setAgreed} label="I accept the terms of use and privacy notice" description="Read them at asmsrounaqh.com/terms and /privacy." />
          <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} label="Continue" />
          <Button variant="ghost" label="Sign out" onClick={() => supabase().auth.signOut()} />
        </VStack>
      </Card>
    </form>
  );
}

function ProfileForm({ profile, notify, onSaved }: { profile: SellerProfile; notify: Notify; onSaved: (p: SellerProfile) => void }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [type, setType] = useState<SellerType>(profile.seller_type);
  const [company, setCompany] = useState(profile.company ?? "");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !validPhone(phone)) return notify("Enter your name and a mobile number.", "error");
    setBusy(true);
    const change = { name: name.trim(), phone: phone.trim(), seller_type: type, company: company.trim() || null };
    const { error } = await supabase().from("seller_profiles").update(change).eq("user_id", profile.user_id);
    setBusy(false);
    if (error) return notify(explain(error), "error");
    notify("Your details are saved.");
    onSaved({ ...profile, ...change });
  }

  return (
    <form className="sel-profile" onSubmit={submit}>
      <SectionHeader title="Your details" description={`Signed in with Google as ${profile.email}.`} />
      <Card padding={6}>
        <VStack gap={5}>
          <ProfileFields {...{ name, setName, phone, setPhone, type, setType, company, setCompany }} />
          <HStack gap={2}><Button type="submit" variant="primary" isLoading={busy} label="Save details" /></HStack>
        </VStack>
      </Card>
    </form>
  );
}

// ----------------------------------------------------------------- listings --
function Listings({ profile, notify, onEdit }: { profile: SellerProfile; notify: Notify; onEdit: (p: PropertyRow, isNew: boolean) => void }) {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [pending, setPending] = useState<RevisionRow[]>([]);
  const [filter, setFilter] = useState<"all" | "drafts" | "review" | "live">("all");
  const active = profile.status === "active";

  const load = useCallback(async () => {
    const [listingRes, revs] = await Promise.all([
      supabase().from("properties").select("*").eq("seller_id", profile.user_id).order("created_at", { ascending: false }),
      supabase().from("property_revisions").select("*").eq("status", "pending"),
    ]);
    if (listingRes.error) notify(explain(listingRes.error), "error");
    setRows((listingRes.data ?? []) as PropertyRow[]);
    setPending((revs.data ?? []) as RevisionRow[]);
  }, [profile.user_id, notify]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, [load]);

  async function act(row: PropertyRow, action: "pause" | "resume" | "sold" | "reconfirm" | "withdraw", done: string) {
    const { error } = await supabase().rpc("seller_listing_action", { listing: row.id, action });
    if (error) return notify(explain(error), "error");
    notify(done);
    void load();
  }

  async function removeDraft(row: PropertyRow) {
    if (!confirm(`Delete this draft${row.title ? ` (“${row.title}”)` : ""}? This can’t be undone.`)) return;
    const { error } = await supabase().from("properties").delete().eq("id", row.id!);
    if (error) return notify(explain(error), "error");
    await deletePhotos(row.images.map((i) => i.path).filter((p) => p.startsWith("sellers/")));
    notify("Draft deleted.");
    void load();
  }

  const all = rows ?? [];
  const inReview = (r: PropertyRow) => r.stage === "submitted" || r.stage === "under_review";
  const isDraft = (r: PropertyRow) => r.stage === "draft" || r.stage === "changes_requested";
  const visible = all.filter((r) => filter === "all" || (filter === "drafts" ? isDraft(r) : filter === "review" ? inReview(r) : r.stage === "live"));
  const stat = (label: string, value: typeof filter, n: number, tone?: "warning" | "success") =>
    ({ label, value: rows ? n : "…", tone, isActive: filter === value, onClick: () => setFilter(filter === value ? "all" : value) });

  const newListing = () => onEdit({ ...emptyProperty(), id: crypto.randomUUID(), posted_on: null, last_confirmed_on: null, seller_id: profile.user_id }, true);

  return (
    <section>
      <SectionHeader title="My listings" count={rows ? rows.length : null} description={`Welcome, ${profile.name.split(" ")[0]}. Listings go on the website once our team has checked them.`}>
        <Button variant="primary" icon={<Plus size={16} />} label="List a property" isDisabled={!active} onClick={newListing} />
      </SectionHeader>
      {all.length > 0 && (
        <StatCards items={[
          stat("All listings", "all", all.length),
          stat("Drafts and changes", "drafts", all.filter(isDraft).length, "warning"),
          stat("In review", "review", all.filter(inReview).length),
          stat("Live", "live", all.filter((r) => r.stage === "live").length, "success"),
        ]} />
      )}
      {rows === null ? <p className="adm-muted">Loading…</p> : all.length === 0 ? (
        <Card padding={8}>
          <EmptyState title="No listings yet" description="Describe the property, add photos and documents, and send it for review. It takes about ten minutes, and your draft saves as you go."
            actions={<Button variant="primary" icon={<Plus size={16} />} label="List your first property" isDisabled={!active} onClick={newListing} />} />
        </Card>
      ) : visible.length === 0 ? (
        <div className="adm-empty"><EmptyState isCompact title="Nothing here" description="Try another filter." /></div>
      ) : (
        <ul className="sel-listings" aria-label="Your listings">
          {visible.map((r) => (
            <li key={r.id}>
              <ListingRow row={r} active={active} pending={pending.find((x) => x.property_id === r.id) ?? null}
                onEdit={() => onEdit(r, false)} onDelete={() => void removeDraft(r)}
                onAction={(a, done) => void act(r, a, done)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ListingRow({ row: r, active, pending, onEdit, onDelete, onAction }: {
  row: PropertyRow; active: boolean; pending: RevisionRow | null; onEdit: () => void; onDelete: () => void;
  onAction: (a: "pause" | "resume" | "sold" | "reconfirm" | "withdraw", done: string) => void;
}) {
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const stale = r.stage === "live" && daysSince(r.last_confirmed_on) > STALE_DAYS;
  const editable = active && (r.stage === "draft" || r.stage === "changes_requested");
  const canRevise = active && (r.stage === "live" || r.stage === "paused") && !pending;

  async function toggleHistory() {
    if (history) return setHistory(null);
    const { data } = await supabase().rpc("listing_history", { listing: r.id });
    setHistory((data ?? []) as HistoryRow[]);
  }

  const menu = [
    ...(r.stage === "live" ? [
      { label: "Still available", description: "Confirm the details are current", onClick: () => onAction("reconfirm", "Thanks. The listing is marked as confirmed today.") },
      { label: "Pause", description: "Hide it from buyers for now", onClick: () => onAction("pause", "Paused. Buyers can’t see it until you resume it.") },
    ] : []),
    ...(r.stage === "paused" && active ? [{ label: "Resume", onClick: () => onAction("resume", "Resumed. It is back on the website within a few minutes.") }] : []),
    ...(r.stage === "live" || r.stage === "paused" ? [{ label: "Mark sold", onClick: () => { if (confirm("Mark this property as sold? It leaves search and stops taking enquiries.")) onAction("sold", "Marked sold. Congratulations!"); } }] : []),
    ...(r.stage === "submitted" ? [{ label: "Withdraw from review", description: "Turn it back into a draft", onClick: () => onAction("withdraw", "Withdrawn. It is a draft again.") }] : []),
    ...(r.stage === "live" || r.stage === "sold" ? [{ label: "View on website", href: `/properties/${r.slug}`, target: "_blank" as const }] : []),
    { label: history ? "Hide history" : "Show history", onClick: () => void toggleHistory() },
    ...(r.stage === "draft" ? [{ label: "Delete draft", variant: "destructive" as const, onClick: onDelete }] : []),
  ];

  return (
    <Card padding={4} className="sel-listing">
      <div className="sel-listing-grid">
        <Thumb src={r.images[0] ? mediaUrl(r.images[0].path) : null} />
        <VStack gap={1}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Badge label={STAGE_LABEL[r.stage]} variant={stageTone(r.stage)} />
            {pending && <Badge label="Changes waiting for review" variant="info" />}
            {stale && <Badge label="Please reconfirm" variant="warning" />}
          </HStack>
          <Heading level={2} maxLines={2}>{r.title || "Untitled listing"}</Heading>
          <Text type="supporting">{[r.reference, r.property_type, r.location || "No location yet", r.price ? formatINRShort(r.price) : null].filter(Boolean).join(" · ")}</Text>
          <Text color="secondary" as="p">{SELLER_STAGE_NOTE[r.stage]}{r.stage === "live" && r.last_confirmed_on ? ` Last confirmed ${formatDate(r.last_confirmed_on)}.` : ""}</Text>
        </VStack>
        <HStack gap={1} hAlign="end" vAlign="center" className="sel-listing-actions">
          {editable && <Button variant="primary" label={r.stage === "changes_requested" ? "Make changes" : "Continue"} onClick={onEdit} />}
          {canRevise && <Button label="Edit" onClick={onEdit} />}
          {(r.stage === "live" || r.stage === "sold") && <span className="only-wide"><Button variant="ghost" href={`/properties/${r.slug}`} target="_blank" icon={<ExternalLink size={16} />} label="View" /></span>}
          <MoreMenu label={`More actions for ${r.title || "this listing"}`} alignment="end" items={menu} />
        </HStack>
      </div>
      {r.review_note && (r.stage === "changes_requested" || r.stage === "rejected") && (
        <div className="sel-note"><Banner status={r.stage === "rejected" ? "error" : "warning"} title="Note from our reviewer" description={r.review_note} /></div>
      )}
      {history && (
        <ol className="sel-history" aria-label="History">
          {history.length === 0 ? <li>No history yet.</li> : history.map((h, i) => (
            <li key={i}><Text type="supporting">{formatDate(h.at)}</Text> <Text>{historyLine(h)}{h.by_seller ? "" : " (ASMS team)"}</Text>{h.note && <Text color="secondary" as="p">“{h.note}”</Text>}</li>
          ))}
        </ol>
      )}
    </Card>
  );
}
