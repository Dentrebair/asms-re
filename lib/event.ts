import { enquiriesConnected, visitorId } from "./enquiry";

// The 21 November 2026 event offer. The same window is stored in public.promo_events,
// which is what actually enforces it; these copies drive the countdown and decide
// when the popup shows.
export const EVENT = {
  slug: "nov-21-2026",
  opensAt: Date.parse("2026-11-20T00:00:00+05:30"),
  closesAt: Date.parse("2026-11-21T23:59:59+05:30"),
  path: "/event-offer",
  qrUrl: "https://asmsrounaqh.com/event-offer?src=qr",
};

export type EventPhase = "before" | "open" | "closed";
export const eventPhase = (now = Date.now()): EventPhase => (now < EVENT.opensAt ? "before" : now > EVENT.closesAt ? "closed" : "open");

export type RegistrationSource = "popup" | "page" | "qr";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const headers = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

/** Registers for the offer. Resolves to { code } or { error } with a sentence for the visitor. */
export async function registerForEvent(name: string, company: string, whatsapp: string, source: RegistrationSource): Promise<{ code: string } | { error: string }> {
  if (!enquiriesConnected) return { error: "Registration is not connected yet. Please call us to register." };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_for_event`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ event: EVENT.slug, full_name: name, company, whatsapp, source }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && typeof data === "string") return { code: data };
    const message = typeof data?.message === "string" ? data.message : "";
    // Messages from public.register_for_event() are written for visitors.
    if (res.status < 500 && message && !/permission|function|schema|relation/i.test(message)) return { error: message };
    return { error: "Registration is not responding right now. Please try again in a minute." };
  } catch {
    return { error: "Can’t reach the registration service. Check your connection and try again." };
  }
}

/** Counts a funnel step for the admin panel. Never throws, never blocks. */
export function trackEvent(activity: "view" | "qr_scan" | "form_start") {
  if (!enquiriesConnected || /bot|crawl|spider|lighthouse/i.test(navigator.userAgent)) return;
  void fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event_activity`, {
    method: "POST",
    headers: headers(),
    keepalive: true,
    body: JSON.stringify({ event: EVENT.slug, activity, visitor: visitorId() }),
  }).catch(() => {});
}

/** Remaining time as "5h 04m 09s" (or "2d 5h" when more than a day). */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, "0")}m`;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}
