"use client";

import { Button } from "@astryxdesign/core/Button";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { explain, isConfigured, supabase, type StaffRow } from "./lib";
import { EnquiriesAdmin, isFresh } from "./enquiries-admin";
import { ProductsAdmin } from "./products-admin";
import { PropertiesAdmin } from "./properties-admin";
import { StaffAdmin } from "./staff-admin";
import { SubmissionsAdmin } from "./submissions-admin";
import { SellersAdmin } from "./sellers-admin";
import { EventAdmin } from "./event-admin";
import { Toast } from "./ui";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Spinner } from "@astryxdesign/core/Spinner";
import { AppShell } from "@astryxdesign/core/AppShell";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { HStack } from "@astryxdesign/core/Layout";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { UploadCloud, Building2, ClipboardCheck, ExternalLink, Inbox, LockKeyhole, LogOut, Mail, Package, Store, Ticket, Users, type LucideIcon } from "lucide-react";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";

type Tab = "enquiries" | "event" | "submissions" | "properties" | "products" | "sellers" | "staff";
const TAB_LABELS: Record<Tab, string> = { enquiries: "Enquiries", event: "Event offer", submissions: "Submissions", properties: "Properties", products: "Products", sellers: "Sellers", staff: "Staff" };
const TAB_ICONS: Record<Tab, LucideIcon> = { enquiries: Inbox, event: Ticket, submissions: ClipboardCheck, properties: Building2, products: Package, sellers: Store, staff: Users };
type AuthState = "loading" | "signed-out" | "set-password" | "not-staff" | "ready";

export default function AdminApp() {
  const [state, setState] = useState<AuthState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<StaffRow | null>(null);
  const [tab, setTab] = useState<Tab>("enquiries");
  const [newEnquiries, setNewEnquiries] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const notify = useCallback((message: string, tone: "ok" | "error" = "ok") => setToast({ message, tone }), []);

  const resolve = useCallback(async (s: Session | null, needsPassword = false) => {
    setSession(s);
    if (!s) return setState("signed-out");
    if (needsPassword) return setState("set-password");
    const email = s.user.email?.toLowerCase() ?? "";
    const { data, error } = await supabase().from("staff").select("*").eq("email", email).maybeSingle();
    if (error) notify(explain(error), "error");
    setMe(data as StaffRow | null);
    setState(data ? "ready" : "not-staff");
    // Views from staff browsers are not demand; the public pages skip tracking when this is set.
    if (data) { try { localStorage.setItem("asms-staff", "1"); } catch { /* storage blocked */ } }
    setToast((t) => (t?.tone === "error" ? null : t)); // clear stale sign-in errors
  }, [notify]);

  const pendingPassword = useRef(false);

  useEffect(() => {
    if (!isConfigured) return;
    // Invite and password-reset links land here with the link type in the URL hash.
    const linkType = new URLSearchParams(window.location.hash.slice(1)).get("type");
    pendingPassword.current = linkType === "invite" || linkType === "recovery";
    const { data: sub } = supabase().auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") pendingPassword.current = true;
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "PASSWORD_RECOVERY"].includes(event)) return;
      // Supabase advises against calling it from inside this callback; defer one tick.
      setTimeout(() => void resolve(event === "SIGNED_OUT" ? null : s, Boolean(s) && pendingPassword.current), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [resolve]);

  // Count of new enquiries for the tab badge.
  useEffect(() => {
    if (state !== "ready") return;
    void supabase().from("enquiries").select("status").in("status", ["new", "visit_requested"]).limit(1000).then(({ data }) => setNewEnquiries((data ?? []).filter(isFresh).length));
    // Seller listings and change requests waiting for a decision.
    void Promise.all([
      supabase().from("properties").select("id").in("stage", ["submitted", "under_review"]),
      supabase().from("property_revisions").select("id").eq("status", "pending"),
    ]).then(([a, b]) => setWaiting((a.data?.length ?? 0) + (b.data?.length ?? 0)));
  }, [state]);

  // Auto-dismiss success messages.
  useEffect(() => {
    if (toast?.tone !== "ok") return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!isConfigured) {
    return <Shell><div className="adm-card"><Card padding={8}><VStack gap={3}><Heading level={1}>Admin panel not connected</Heading><Text as="p">Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> for the build, then redeploy. See <code>supabase/README.md</code>.</Text></VStack></Card></div></Shell>;
  }
  if (state === "loading") return <Shell><div className="adm-center"><Spinner label="Loading" /></div></Shell>;
  if (state === "signed-out") return <Shell><SignIn notify={notify} /><Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} /></Shell>;
  if (state === "set-password") return <Shell><SetPassword onDone={() => { pendingPassword.current = false; history.replaceState(null, "", "/admin"); void resolve(session); }} notify={notify} /><Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} /></Shell>;
  if (state === "not-staff" || !me) {
    return (
      <Shell>
        <div className="adm-card"><Card padding={8}><VStack gap={4}>
          <Heading level={1}>No editing access</Heading>
          <Text as="p">You’re signed in as <strong>{session?.user.email}</strong>, but this email isn’t on the staff list. Ask an owner to add it.</Text>
          <Button type="button" onClick={() => supabase().auth.signOut()} variant="primary" label="Sign out" />
        </VStack></Card></div>
      </Shell>
    );
  }

  return (
    <div className="adm adm-portal">
      <AppShell
        variant="elevated"
        mobileNav={{ breakpoint: "md" }}
        topNav={
          <div className="adm-header">
            <TopNav
              label="Admin"
              heading={
                <TopNavHeading
                  logo={
                    // eslint-disable-next-line @next/next/no-img-element -- static export
                    <img src="/icon.png" alt="" width={30} height={30} className="adm-logo" />
                  }
                  heading="ASMS–ROUNAQH"
                  headingHref="/admin"
                  headerEndContent={<span className="only-wide"><Badge label="Admin" variant="warning" /></span>}
                />
              }
              endContent={
                <HStack gap={2} vAlign="center">
                  <PublishNow notify={notify} />
                  <span className="adm-user-name"><Text type="supporting">{me.name || me.email}</Text></span>
                  <span className="only-wide"><Button variant="ghost" label="Sign out" icon={<LogOut size={16} />} onClick={() => supabase().auth.signOut()} /></span>
                  <span className="only-narrow"><IconButton variant="ghost" label="Sign out" icon={<LogOut size={16} />} onClick={() => supabase().auth.signOut()} /></span>
                </HStack>
              }
            />
          </div>
        }
        sideNav={
          <SideNav
            footer={<SideNavItem label="View website" href="/" icon={ExternalLink} />}>
            <SideNavSection title="Manage">
              {(["enquiries", "event", "submissions", "properties", "products", "sellers", ...(me.role === "owner" ? ["staff"] : [])] as Tab[]).map((t) => {
                const n = t === "enquiries" ? newEnquiries : t === "submissions" ? waiting : 0;
                return (
                  <SideNavItem key={t} label={TAB_LABELS[t]} icon={TAB_ICONS[t]} isSelected={tab === t} onClick={() => setTab(t)}
                    endContent={n > 0 ? <span className="adm-count" aria-label={t === "enquiries" ? `${n} new` : `${n} waiting`}><Badge label={String(n)} variant="warning" /></span> : undefined} />
                );
              })}
            </SideNavSection>
          </SideNav>
        }>
        <main className="adm-main" data-section={tab}>
          {tab === "enquiries" && <EnquiriesAdmin me={me} notify={notify} onNewCount={setNewEnquiries} />}
          {tab === "event" && <EventAdmin notify={notify} />}
          {tab === "submissions" && <SubmissionsAdmin notify={notify} onCount={setWaiting} />}
          {tab === "properties" && <PropertiesAdmin notify={notify} />}
          {tab === "products" && <ProductsAdmin notify={notify} />}
          {tab === "sellers" && <SellersAdmin notify={notify} />}
          {tab === "staff" && me.role === "owner" && <StaffAdmin me={me} notify={notify} />}
        </main>
      </AppShell>
      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}

function PublishNow({ notify }: { notify: (m: string, t?: "ok" | "error") => void }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const { error } = await supabase().rpc("request_site_rebuild");
    setBusy(false);
    notify(error ? explain(error) : "Website update started. It will be live in about 3 minutes.", error ? "error" : "ok");
  }
  const label = busy ? "Starting…" : "Update website now";
  return (
    <>
      <span className="only-wide"><Button type="button" isDisabled={busy} onClick={run} tooltip="Changes publish automatically; use this to force an update." variant="secondary" icon={<UploadCloud size={16} />} label={label} /></span>
      <span className="only-narrow"><IconButton isDisabled={busy} onClick={run} variant="secondary" label={label} icon={<UploadCloud size={16} />} /></span>
    </>
  );
}

function SignIn({ notify }: { notify: (m: string, t?: "ok" | "error") => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "reset">("password");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "password") {
      const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) notify(/Invalid login/i.test(error.message) ? "Wrong email or password." : explain(error), "error");
    } else {
      const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
      notify(error ? explain(error) : "If this email has an account, a reset link is on its way.", error ? "error" : "ok");
      if (!error) setMode("password");
    }
    setBusy(false);
  }

  return (
    <form className="adm-card" onSubmit={submit}>
      <Card padding={8} elevation="high">
        <VStack gap={5}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img className="adm-brand-mark" src="/brand/logo-script.webp" alt="ASMS-ROUNAQH" width={260} height={160} />
          <Heading level={1}>{mode === "password" ? "Staff sign in" : "Reset password"}</Heading>
          <TextInput label="Email" type="email" autoComplete="username" isRequired value={email} onChange={setEmail} startIcon={Mail} />
          {mode === "password" && <TextInput label="Password" type="password" autoComplete="current-password" isRequired value={password} onChange={setPassword} startIcon={LockKeyhole} />}
          <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} label={busy ? "Please wait…" : mode === "password" ? "Sign in" : "Send reset link"} />
          <div><Button variant="ghost" onClick={() => setMode(mode === "password" ? "reset" : "password")} label={mode === "password" ? "Forgot your password?" : "Back to sign in"} /></div>
        </VStack>
      </Card>
    </form>
  );
}

function SetPassword({ onDone, notify }: { onDone: () => void; notify: (m: string, t?: "ok" | "error") => void }) {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return notify("Use at least 8 characters.", "error");
    if (password !== confirmPw) return notify("The passwords don’t match.", "error");
    setBusy(true);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) return notify(explain(error), "error");
    notify("Password saved.");
    onDone();
  }

  return (
    <form className="adm-card" onSubmit={submit}>
      <Card padding={8} elevation="high">
        <VStack gap={5}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img className="adm-brand-mark" src="/brand/logo-script.webp" alt="ASMS-ROUNAQH" width={260} height={160} />
          <Heading level={1}>Choose your password</Heading>
          <TextInput label="New password" type="password" autoComplete="new-password" isRequired value={password} onChange={setPassword} description="At least 8 characters." />
          <TextInput label="Repeat password" type="password" autoComplete="new-password" isRequired value={confirmPw} onChange={setConfirmPw} />
          <Button type="submit" variant="primary" size="lg" width="100%" isLoading={busy} label={busy ? "Saving…" : "Save password"} />
        </VStack>
      </Card>
    </form>
  );
}
