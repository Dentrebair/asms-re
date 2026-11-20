import { COMPANY } from "./company";

// Sends website enquiries to the Supabase enquiries table (insert only; the
// database rules stop visitors reading anything back) and records first-party
// events through the public.track() function. Both are no-ops when Supabase
// is not configured for the build.

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const enquiriesConnected = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const ENQUIRY_ENDPOINT = enquiriesConnected ? `${SUPABASE_URL}/rest/v1/enquiries` : "";

/** WhatsApp click-to-chat number with country code, digits only. Defaults to the business number in lib/company.ts. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || COMPANY.whatsapp).replace(/\D/g, "");

export type EnquiryKind = "property" | "visit" | "product" | "sell" | "general";

export type Enquiry = {
  kind: EnquiryKind;
  source: "contact_page" | "property_page" | "product_page";
  name: string;
  phone: string;
  email?: string | null;
  property_ref?: string | null;
  product_slug?: string | null;
  interest?: string | null;
  message?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  organisation?: string | null;
  quantity?: string | null;
  delivery_location?: string | null;
  consent: boolean;
};

const headers = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" });

/** Turns the database's refusal into a sentence a visitor can act on. */
function reason(status: number, message: string) {
  if (/Too many enquiries/.test(message)) return "We have already received several enquiries from this number in the last hour. Please try again later.";
  if (/no longer available/.test(message)) return "This property is no longer available, so we cannot take enquiries for it. Please look at similar properties.";
  if (/visit date is in the past/.test(message)) return "Please choose a visit date from today onwards.";
  if (/phone/.test(message)) return "Please check the phone number: use digits, spaces and + only.";
  if (/email/.test(message)) return "Please check the email address.";
  if (status >= 500 || status === 0) return "Our enquiry service is not responding right now. Please try again in a few minutes.";
  return "Your enquiry could not be sent. Please check the details and try again.";
}

/** Saves an enquiry. Resolves to null on success, or a sentence explaining the failure. */
export async function sendEnquiry(enquiry: Enquiry): Promise<string | null> {
  if (!enquiriesConnected) return "Nothing was sent: online enquiries are not connected yet.";
  const body = Object.fromEntries(Object.entries(enquiry).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  try {
    const res = await fetch(ENQUIRY_ENDPOINT, { method: "POST", headers: { ...headers(), Prefer: "return=minimal" }, body: JSON.stringify(body) });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return reason(res.status, String(data?.message ?? ""));
  } catch {
    return reason(0, "");
  }
}

// ------------------------------------------------------------------ events --
export type TrackedEvent = "property_view" | "whatsapp_click" | "property_shared";

const BOT = /bot|crawl|spider|slurp|lighthouse|pagespeed/i;

/** A random ID for this browser, kept so repeat views can be told apart. Not linked to any person. */
export function visitorId() {
  try {
    let id = localStorage.getItem("asms-visitor");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("asms-visitor", id); }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const isStaffBrowser = () => { try { return localStorage.getItem("asms-staff") === "1"; } catch { return false; } };

/** Records a first-party event for a live property. Never throws, never blocks. */
export function track(type: TrackedEvent, propertyRef: string, source = "detail") {
  if (!enquiriesConnected || BOT.test(navigator.userAgent) || isStaffBrowser()) return;
  void fetch(`${SUPABASE_URL}/rest/v1/rpc/track`, {
    method: "POST",
    headers: headers(),
    keepalive: true,
    body: JSON.stringify({ event_type: type, property_ref: propertyRef, visitor: visitorId(), source }),
  }).catch(() => {});
}
