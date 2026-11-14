"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { explain, isConfigured, supabase, type StaffRow } from "./lib";
import { EnquiriesAdmin, isFresh } from "./enquiries-admin";
import { ProductsAdmin } from "./products-admin";
import { PropertiesAdmin } from "./properties-admin";
import { StaffAdmin } from "./staff-admin";
import { Toast } from "./ui";

type Tab = "enquiries" | "properties" | "products" | "staff";
const TAB_LABELS: Record<Tab, string> = { enquiries: "Enquiries", properties: "Properties", products: "Products", staff: "Staff" };
type AuthState = "loading" | "signed-out" | "set-password" | "not-staff" | "ready";

export default function AdminApp() {
  const [state, setState] = useState<AuthState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<StaffRow | null>(null);
  const [tab, setTab] = useState<Tab>("enquiries");
  const [newEnquiries, setNewEnquiries] = useState(0);
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
  }, [state]);

  // Auto-dismiss success messages.
  useEffect(() => {
    if (toast?.tone !== "ok") return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!isConfigured) {
    return <Shell><div className="adm-card"><h1>Admin panel not connected</h1><p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> for the build, then redeploy. See <code>supabase/README.md</code>.</p></div></Shell>;
  }
  if (state === "loading") return <Shell><p className="adm-muted adm-center">Loading…</p></Shell>;
  if (state === "signed-out") return <Shell><SignIn notify={notify} /><Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} /></Shell>;
  if (state === "set-password") return <Shell><SetPassword onDone={() => { pendingPassword.current = false; history.replaceState(null, "", "/admin"); void resolve(session); }} notify={notify} /><Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} /></Shell>;
  if (state === "not-staff" || !me) {
    return (
      <Shell>
        <div className="adm-card">
          <h1>No editing access</h1>
          <p>You’re signed in as <strong>{session?.user.email}</strong>, but this email isn’t on the staff list. Ask an owner to add it.</p>
          <button type="button" className="adm-btn" onClick={() => supabase().auth.signOut()}>Sign out</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="adm-header">
        <a className="adm-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
          <img src="/icon.png" alt="" width={34} height={34} /> ASMS–ROUNAQH <small>Admin</small></a>
        <nav aria-label="Admin sections">
          {(["enquiries", "properties", "products", ...(me.role === "owner" ? ["staff"] : [])] as Tab[]).map((t) => (
            <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}{t === "enquiries" && newEnquiries > 0 && <span className="adm-count" aria-label={`${newEnquiries} new`}>{newEnquiries}</span>}
            </button>
          ))}
        </nav>
        <div className="adm-user">
          <PublishNow notify={notify} />
          <span>{me.name || me.email}</span>
          <button type="button" className="adm-link" onClick={() => supabase().auth.signOut()}>Sign out</button>
        </div>
      </header>
      <main className="adm-main">
        {tab === "enquiries" && <EnquiriesAdmin me={me} notify={notify} onNewCount={setNewEnquiries} />}
        {tab === "properties" && <PropertiesAdmin notify={notify} />}
        {tab === "products" && <ProductsAdmin notify={notify} />}
        {tab === "staff" && me.role === "owner" && <StaffAdmin me={me} notify={notify} />}
      </main>
      <Toast message={toast?.message ?? null} tone={toast?.tone} onClose={() => setToast(null)} />
    </Shell>
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
  return <button type="button" className="adm-btn adm-btn-ghost" disabled={busy} onClick={run} title="Changes publish automatically; use this to force an update.">{busy ? "Starting…" : "Update website now"}</button>;
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
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      <img className="adm-brand-mark" src="/brand/logo-script.webp" alt="ASMS-ROUNAQH" width={260} height={160} />
      <h1>{mode === "password" ? "Staff sign in" : "Reset password"}</h1>
      <label className="adm-field"><span className="adm-label">Email</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {mode === "password" && (
        <label className="adm-field"><span className="adm-label">Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      )}
      <button type="submit" className="adm-btn adm-btn-block" disabled={busy}>{busy ? "Please wait…" : mode === "password" ? "Sign in" : "Send reset link"}</button>
      <button type="button" className="adm-link" onClick={() => setMode(mode === "password" ? "reset" : "password")}>
        {mode === "password" ? "Forgot your password?" : "Back to sign in"}
      </button>
    </form>
  );
}

function SetPassword({ onDone, notify }: { onDone: () => void; notify: (m: string, t?: "ok" | "error") => void }) {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
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
      {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
      <img className="adm-brand-mark" src="/brand/logo-script.webp" alt="ASMS-ROUNAQH" width={260} height={160} />
      <h1>Choose your password</h1>
      <label className="adm-field"><span className="adm-label">New password</span><input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <label className="adm-field"><span className="adm-label">Repeat password</span><input type="password" autoComplete="new-password" minLength={8} required value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} /></label>
      <button type="submit" className="adm-btn adm-btn-block" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}
