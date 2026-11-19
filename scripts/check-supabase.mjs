// Read-only check of a Supabase project against supabase/README.md, using only the
// public URL and anon key (the same ones the website ships). It writes nothing.
// Usage: put NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then
//   node --env-file=.env.local scripts/check-supabase.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. in .env.local).");
  process.exit(2);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const get = async (path, init = {}) => {
  const res = await fetch(url + path, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

let failed = 0;
const check = (label, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${label}${!ok && detail ? ` — ${detail}` : ""}`); };
const show = (v) => JSON.stringify(v).slice(0, 160);

// Step 2: tables, rules and seed
const props = await get("/rest/v1/properties?select=reference,stage");
check("schema loaded (properties table exists)", props.status === 200, show(props.body));
if (props.status === 200) {
  check("visitors see only live and sold listings", props.body.every((p) => ["live", "sold"].includes(p.stage)), show(props.body));
  check("seed-listings.sql loaded (ASMS-0001 is live)", props.body.some((p) => p.reference === "ASMS-0001" && p.stage === "live"), show(props.body));
}
const cats = await get("/rest/v1/product_categories?select=id");
check("product categories seeded (3)", cats.status === 200 && cats.body.length === 3, show(cats.body));
const staff = await get("/rest/v1/staff?select=email");
check("visitors cannot read the staff list", staff.status !== 200 || staff.body.length === 0, show(staff.body));
const enq = await get("/rest/v1/enquiries?select=id");
check("visitors cannot read enquiries", enq.status !== 200 || enq.body.length === 0, show(enq.body));
const track = await get("/rest/v1/rpc/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "property_view", property_ref: "NO-SUCH-REF", visitor: crypto.randomUUID() }) });
check("track() function is callable (and ignores unknown listings)", track.status === 204 || track.status === 200, `${track.status} ${show(track.body)}`);
const media = await get("/storage/v1/object/public/media/__check__/missing.webp");
check("public photo bucket 'media' exists", !/bucket not found/i.test(JSON.stringify(media.body)), show(media.body));

// Steps 4, 5 and 10: auth settings (public endpoint)
const auth = await get("/auth/v1/settings");
if (auth.status === 200) {
  check("sign-ups are open (needed for new sellers)", auth.body.disable_signup === false);
  check("email sign-ups must be confirmed", auth.body.mailer_autoconfirm === false);
  check("Google sign-in enabled (step 10)", auth.body.external?.google === true);
} else check("auth settings readable", false, show(auth.body));

console.log(failed ? `\n${failed} check(s) need attention.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
