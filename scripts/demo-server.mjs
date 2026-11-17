#!/usr/bin/env node
// Local demo: the real site, admin panel and seller portal against a fake Supabase, no account needed.
//   npm run demo   →   http://localhost:54401/admin   (demo@asms.local / demo1234)
//                      http://localhost:54401/seller  (any email on the demo Google page)
//
// Fakes Supabase auth (password and Google sign-in), database (PostgREST and the
// seller-portal functions) and storage in one process, keeps data in .demo/
// (git-ignored), and — like the real setup — rebuilds the public site a few
// seconds after every change that affects it, so you can see edits live.
// content/content.json is restored to the committed sample when you stop it.
//
// The rules follow supabase/schema.sql: what each person may read and write,
// what a seller's write keeps, and the review steps. supabase/tests checks the
// real rules; this copy only has to behave the same for the demo.
//
// Env (for tests): DEMO_DIR (data folder, default .demo), DEMO_NO_BUILD=1 (serve dist/client as is).

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 54401;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "demo1234";
const demoDir = process.env.DEMO_DIR ? normalize(process.env.DEMO_DIR) : join(root, ".demo");
const noBuild = process.env.DEMO_NO_BUILD === "1";
const mediaDir = join(demoDir, "media");
const docsDir = join(demoDir, "seller-docs");
const dbFile = join(demoDir, "db.json");
const contentFile = join(root, "content", "content.json");
const contentBackup = join(demoDir, "content.sample.json");
const site = join(root, "dist", "client");
mkdirSync(mediaDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });
if (!existsSync(contentBackup)) copyFileSync(contentFile, contentBackup);

/** Demo user ids are stable UUIDs made from the email, as Supabase's would be stable per account. */
const userId = (email) => {
  const h = createHash("sha256").update(`demo:${email}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// The fields a seller may write (private.seller_fields() in supabase/schema.sql).
const SELLER_FIELDS = ["title", "category", "property_type", "transaction_type", "ownership", "location", "locality",
  "price", "price_negotiable", "area_sqft", "area_unit", "dimensions", "facing", "bhk", "bathrooms", "carpet_area_sqft",
  "furnishing", "floor_info", "parking", "possession", "road_width_ft", "frontage_ft", "land_use", "corner_plot",
  "boundary_wall", "gated_layout", "floors_allowed", "usable_area_sqft", "access_notes", "map_url", "zoning_notes",
  "approval", "rera", "availability", "description", "amenities", "nearby", "images"];
const pick = (obj, keys) => Object.fromEntries(Object.entries(obj ?? {}).filter(([k]) => keys.includes(k)));
const gaps = (p) => [
  (p.title ?? "").trim().length < 5 && "a title",
  !(p.location ?? "").trim() && "the location",
  p.area_sqft == null && "the area",
  (p.description ?? "").trim().length < 50 && "a description of at least 50 characters",
  (p.images ?? []).length < 3 && "at least 3 photos",
].filter(Boolean);
const BLANK_PROPERTY = {
  title: "", stage: "draft", featured: false, category: "plot", property_type: "Residential plot", transaction_type: null, ownership: null, location: "", locality: null,
  price: null, price_negotiable: null, area_sqft: null, area_unit: "sqft", dimensions: null, facing: null, bhk: null, bathrooms: null, carpet_area_sqft: null,
  furnishing: null, floor_info: null, parking: null, possession: null, road_width_ft: null, frontage_ft: null, land_use: null, corner_plot: null, boundary_wall: null,
  gated_layout: null, floors_allowed: null, usable_area_sqft: null, access_notes: null, map_url: null, zoning_notes: null, approval: null, rera: null, availability: null,
  description: null, amenities: [], nearby: [], documents: [], images: [], posted_on: null, last_confirmed_on: null, sort_order: 0,
  seller_id: null, review_note: null, submitted_at: null,
};

// ------------------------------------------------------------- seed data --
function seed() {
  const sample = JSON.parse(readFileSync(contentBackup, "utf8"));
  const local = (src) => (src?.startsWith("/products/") ? `products/${src.slice(10)}` : null); // served from public/
  const plot = sample.properties[0];
  return {
    staff: [
      { email: "demo@asms.local", name: "Demo Owner", role: "owner", created_at: "2026-01-01T00:00:00Z" },
      { email: "editor@asms.local", name: "Demo Editor", role: "editor", created_at: "2026-01-02T00:00:00Z" },
    ],
    product_categories: sample.categories.map((c, i) => ({ ...c, sort_order: i + 1 })),
    products: sample.products.map((p, i) => ({
      id: `prod-${i + 1}`, slug: p.slug, category_id: p.categoryId, name: p.name, summary: p.summary, specs: p.specs, unit: p.unit,
      suitable_use: p.suitableUse, availability: p.availability,
      image_path: local(p.image?.src), image_alt: null, published: true, sort_order: i, created_at: now(),
    })),
    enquiries: [{
      id: "enq-1", created_at: now(), kind: "visit", source: "property_page", name: "Ravi Kumar (demo)", phone: "98400 12345", email: "ravi@example.com",
      property_ref: plot.reference, property_id: "prop-1", product_slug: null, interest: plot.title, message: "Can I visit on Saturday morning?",
      preferred_date: null, preferred_time: "Morning", organisation: null, quantity: null, delivery_location: null, repeat_contact: false,
      status: "visit_requested", assigned_to: null, follow_up_on: null, notes: null,
    }],
    enquiry_history: [],
    // Every sample property, in the same shape as the database (camelCase to snake_case).
    properties: sample.properties.map((p, i) => ({
      ...Object.fromEntries(Object.entries(p).filter(([k]) => !["images", "areaSqFt", "carpetAreaSqFt", "usableAreaSqFt"].includes(k)).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v])),
      id: `prop-${i + 1}`, area_sqft: p.areaSqFt, carpet_area_sqft: p.carpetAreaSqFt, usable_area_sqft: p.usableAreaSqFt,
      images: [{ path: "properties/demo-hero.webp", alt: p.images[0]?.alt ?? p.title }], sort_order: i, created_at: now(),
    })),
  };
}

/** A demo seller with listings at each review step, so the Submissions tab has something in it. */
function seedSellers(db) {
  const email = "lakshmi@demo.local";
  const uid = userId(email);
  const photo = (n) => Array.from({ length: n }, (_, i) => ({ path: "properties/demo-hero.webp", alt: i === 0 ? "Front of the plot" : "" }));
  const at = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString();
  db.demo_users = { ...(db.demo_users ?? {}), [email]: "Lakshmi Narayanan (demo)" };
  db.seller_profiles = [{ user_id: uid, email, name: "Lakshmi Narayanan (demo)", phone: "98410 22334", seller_type: "owner", company: null, status: "active", created_at: at(12) }];
  db.seller_sequence = 3;
  const base = (n, extra) => ({ ...BLANK_PROPERTY, id: `seller-prop-${n}`, seller_id: uid, reference: `ASMS-S000${n}`, slug: `asms-s000${n}`, created_at: at(10 - n), ...extra });
  const submitted = base(1, {
    stage: "submitted", submitted_at: at(1), title: "East-facing corner plot in Porur", location: "Porur, Chennai", locality: "Near Porur junction",
    price: 9600000, price_negotiable: true, area_sqft: 2400, dimensions: "40 × 60 ft", facing: "East", road_width_ft: 30, frontage_ft: 40, corner_plot: true, approval: "DTCP",
    description: "A 2,400 sq ft corner plot on a 30 ft road, five minutes from Porur junction. Patta in my name; EC for 30 years available.", images: photo(4),
  });
  const sentBack = base(2, {
    stage: "changes_requested", submitted_at: at(5), category: "residential", property_type: "Apartment", title: "2 BHK apartment in Anna Nagar", location: "Anna Nagar, Chennai",
    price: 8500000, area_sqft: 1050, bhk: 2, bathrooms: 2, description: "Second-floor 2 BHK with covered parking, close to the Anna Nagar tower park and schools.",
    images: photo(3), review_note: "Please add a photo of the kitchen and upload the building approval.",
  });
  const draft = base(3, { stage: "draft", title: "Farm land near Chengalpattu", category: "agricultural", property_type: "Agricultural land", location: "Chengalpattu" });
  db.properties.push(submitted, sentBack, draft);
  db.seller_documents = [{ id: "doc-1", property_id: submitted.id, seller_id: uid, label: "Patta", path: `${uid}/${submitted.id}/patta.pdf`, file_name: "patta-porur.pdf", size_bytes: 524, created_at: at(1) }];
  const pdf = "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj 4 0 obj<</Length 52>>stream\nBT /F1 14 Tf 20 60 Td (Demo patta document) Tj ET\nendstream endobj 5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n";
  mkdirSync(join(docsDir, uid, submitted.id), { recursive: true });
  writeFileSync(join(docsDir, uid, submitted.id, "patta.pdf"), pdf);
  db.property_revisions = [];
  db.audit_log = [
    { id: 1, at: at(9), actor: email, property_id: submitted.id, seller_id: uid, action: "created", note: null, detail: null },
    { id: 2, at: at(1), actor: email, property_id: submitted.id, seller_id: uid, action: "stage", note: null, detail: { from: "draft", to: "submitted" } },
    { id: 3, at: at(8), actor: email, property_id: sentBack.id, seller_id: uid, action: "created", note: null, detail: null },
    { id: 4, at: at(5), actor: email, property_id: sentBack.id, seller_id: uid, action: "stage", note: null, detail: { from: "draft", to: "submitted" } },
    { id: 5, at: at(3), actor: "editor@asms.local", property_id: sentBack.id, seller_id: uid, action: "stage", note: sentBack.review_note, detail: { from: "submitted", to: "changes_requested" } },
    { id: 6, at: at(7), actor: email, property_id: draft.id, seller_id: uid, action: "created", note: null, detail: null },
  ];
}

// Built-in photos for seeded rows (uploads go to .demo/media).
const builtin = (path) => {
  const p = path.replace(/-sm(\.[a-z]+)$/, "$1");
  if (p === "properties/demo-hero.webp") return join(root, "public", "asms-hero.webp");
  if (p.startsWith("products/") && existsSync(join(root, "public", p))) return join(root, "public", p);
  return null;
};

let db = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, "utf8")) : seed();
db.enquiries ??= []; // demo data saved before enquiries existed
db.enquiry_history ??= [];
if (!db.seller_profiles) seedSellers(db); // demo data saved before the seller portal existed
const save = () => writeFileSync(dbFile, JSON.stringify(db, null, 1));
save();

function audit(entry) {
  db.audit_log.push({ id: (db.audit_log.at(-1)?.id ?? 0) + 1, at: now(), actor: null, property_id: null, seller_id: null, note: null, detail: null, ...entry });
}
const isPublic = (stage) => stage === "live" || stage === "sold";

// --------------------------------------------------------------- rebuild --
let timer = null, building = false, again = false;
function scheduleRebuild(reason) {
  if (noBuild) return;
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(reason), 2500);
}
function rebuild(reason) {
  if (noBuild) return;
  if (building) { again = true; return; }
  building = true;
  const started = Date.now();
  console.log(`↻ Rebuilding website (${reason})…`);
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: BASE, NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo-anon-key" };
  const child = spawn("sh", ["-c", "node scripts/pull-content.mjs && npx vinext build"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (d) => { output += d; });
  child.stderr.on("data", (d) => { output += d; });
  child.on("close", (code) => {
    building = false;
    if (code === 0) console.log(`✓ Website updated in ${Math.round((Date.now() - started) / 1000)}s — refresh ${BASE}/properties`);
    else console.log(`✗ Rebuild failed:\n${output.slice(-2000)}`);
    if (again) { again = false; rebuild("queued changes"); }
  });
}

// ----------------------------------------------------------------- server --
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { ...cors, "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
};
const fail = (res, message, code = "P0001", status = 400) => send(res, status, { code, message, details: null, hint: null });
const denied = (res) => send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
const read = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
const KEYS = { staff: "email", product_categories: "id", products: "slug", properties: "slug", enquiries: "id" };
const UNIQUE = { properties: ["slug", "reference"], products: ["slug"], staff: ["email"], product_categories: ["id"], enquiries: ["id"] };
const ENQUIRY_FIELDS = ["kind", "source", "name", "phone", "email", "property_ref", "product_slug", "interest", "message", "preferred_date", "preferred_time", "organisation", "quantity", "delivery_location", "consent"];
const filters = (url) => [...url.searchParams].filter(([k]) => !["select", "order", "limit", "columns", "on_conflict"].includes(k));
const unquote = (v) => decodeURIComponent(v).replace(/^"|"$/g, "");
const match = (row, fs) => fs.every(([k, v]) => {
  if (v.startsWith("eq.")) return String(row[k]) === unquote(v.slice(3));
  if (v.startsWith("is.")) return String(row[k]) === v.slice(3);
  if (v.startsWith("in.(")) return v.slice(4, -1).split(",").map(unquote).includes(String(row[k]));
  return true;
});
/** PostgREST-style ?order=a.desc,b,c.desc.nullslast (nulls go last by default for asc, first for desc, as in Postgres). */
function sortRows(rows, order) {
  if (!order) return rows;
  const keys = order.split(",").map((part) => {
    const [col, ...mods] = part.split(".");
    const desc = mods.includes("desc");
    return { col, desc, nullsLast: mods.includes("nullslast") || (!desc && !mods.includes("nullsfirst")) };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc, nullsLast } of keys) {
      const x = a[col] ?? null, y = b[col] ?? null;
      if (x === y) continue;
      if (x === null) return nullsLast ? 1 : -1;
      if (y === null) return nullsLast ? -1 : 1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      if (c) return desc ? -c : c;
    }
    return 0;
  });
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".rsc": "text/x-component", ".pdf": "application/pdf" };

/** storage-js may send raw bytes or multipart form data; return just the file bytes. */
function fileBytes(req, body) {
  const type = req.headers["content-type"] ?? "";
  const boundary = /boundary=(.+)$/.exec(type)?.[1];
  if (!boundary) return { bytes: body, type: type.split(";")[0] };
  const parts = body.toString("latin1").split(`--${boundary}`);
  for (const part of parts) {
    const [head, ...rest] = part.split("\r\n\r\n");
    if (/filename=|name=""/.test(head)) {
      const data = rest.join("\r\n\r\n").replace(/\r\n$/, "");
      return { bytes: Buffer.from(data, "latin1"), type: /content-type:\s*([^\r\n]+)/i.exec(head)?.[1] ?? "image/webp" };
    }
  }
  return { bytes: body, type: "application/octet-stream" };
}

// Demo tokens encode the email, so a signed-in browser survives a demo restart.
const emailFrom = (token) => { try { return token?.startsWith("demo.") ? Buffer.from(token.slice(5), "base64url").toString() : null; } catch { return null; } };
const safe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Stand-in for Google's account chooser: the demo signs in whatever email is typed here. */
function googlePage(redirectTo) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in with Google (demo)</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f3f4;font:16px/1.5 system-ui,sans-serif;color:#202124}
form{width:min(400px,calc(100% - 32px));padding:32px;border-radius:8px;background:#fff;box-shadow:0 1px 3px #0003;display:grid;gap:14px}
h1{margin:0;font-size:22px;font-weight:500}p{margin:0;color:#5f6368;font-size:14px}label{display:grid;gap:4px;font-size:14px}
input{padding:10px 12px;border:1px solid #dadce0;border-radius:4px;font:inherit}button{padding:10px;border:0;border-radius:4px;background:#1a73e8;color:#fff;font:inherit;font-weight:500;cursor:pointer}</style></head>
<body><form method="get" action="/auth/v1/demo-google"><h1>Sign in with Google</h1><p>Demo only: no Google account is used. Type any email to sign in as that seller.</p>
<label>Email<input name="email" type="email" required value="lakshmi@demo.local" autocomplete="off"></label>
<label>Name<input name="name" required value="Lakshmi Narayanan (demo)"></label>
<input type="hidden" name="redirect_to" value="${safe(redirectTo)}"><button type="submit">Continue</button></form></body></html>`;
}

createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  if (req.method === "OPTIONS") return send(res, 204);
  const body = await read(req);
  const json = () => { try { return JSON.parse(body || "{}"); } catch { return {}; } };

  // ---- auth
  if (url.pathname === "/auth/v1/token") {
    const params = json();
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const email = emailFrom(params.refresh_token);
      if (!email) return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token", code: "refresh_token_not_found" });
      return send(res, 200, session(email));
    }
    if (params.password !== PASSWORD) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", code: "invalid_credentials", msg: "Invalid login credentials" });
    return send(res, 200, session(params.email.toLowerCase()));
  }
  if (url.pathname === "/auth/v1/authorize") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(googlePage(url.searchParams.get("redirect_to") ?? `${BASE}/seller`));
  }
  if (url.pathname === "/auth/v1/demo-google") {
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
    const target = url.searchParams.get("redirect_to") ?? `${BASE}/seller`;
    if (!email.includes("@") || !target.startsWith(BASE)) return send(res, 400, { message: "bad demo sign-in" });
    db.demo_users = { ...(db.demo_users ?? {}), [email]: (url.searchParams.get("name") ?? "").trim() || email.split("@")[0] };
    save();
    const s = session(email);
    const hash = new URLSearchParams({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: "3600", expires_at: String(s.expires_at), token_type: "bearer", provider_token: "demo" });
    console.log(`🔑 ${email} signed in with (demo) Google`);
    res.writeHead(302, { location: `${target}#${hash}` });
    return res.end();
  }
  if (url.pathname === "/auth/v1/recover") { console.log(`✉ (demo) password reset requested for ${json().email} — password is always ${PASSWORD}`); return send(res, 200, {}); }
  if (url.pathname === "/auth/v1/logout") return send(res, 204);
  if (url.pathname === "/auth/v1/user") {
    const email = emailFrom((req.headers.authorization ?? "").replace("Bearer ", ""));
    if (!email) return send(res, 401, { message: "not signed in" });
    return send(res, 200, user(email));
  }
  const me = emailFrom((req.headers.authorization ?? "").replace("Bearer ", ""));
  const staff = me && db.staff.find((s) => s.email === me);
  const uid = me ? userId(me) : null;
  const seller = uid ? db.seller_profiles.find((s) => s.user_id === uid) : null;
  const activeSeller = seller?.status === "active";

  // ---- storage: public media bucket
  if (url.pathname.startsWith("/storage/v1/object/public/media/")) {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/public/media/".length));
    const file = existsSync(join(mediaDir, path)) ? join(mediaDir, path) : builtin(path);
    if (!file || !existsSync(file)) return send(res, 404, { message: "Object not found" });
    res.writeHead(200, { ...cors, "content-type": mime[extname(file)] ?? "image/webp" });
    return res.end(readFileSync(file));
  }
  const sellerPhotoPath = (path) => path.startsWith(`sellers/${uid}/`);
  if (url.pathname.startsWith("/storage/v1/object/media/") && req.method === "POST") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/media/".length));
    if (!staff && !(activeSeller && sellerPhotoPath(path))) return denied(res);
    const { bytes } = fileBytes(req, body);
    mkdirSync(dirname(join(mediaDir, path)), { recursive: true });
    writeFileSync(join(mediaDir, path), bytes);
    console.log(`⇪ Photo uploaded: ${path} (${Math.round(bytes.length / 1024)} KB)`);
    return send(res, 200, { Key: `media/${path}`, Id: path });
  }
  if (url.pathname === "/storage/v1/object/media" && req.method === "DELETE") {
    const prefixes = json().prefixes ?? [];
    if (!staff && !(seller && prefixes.every(sellerPhotoPath))) return send(res, 403, { message: "not allowed" });
    console.log(`🗑 Photos deleted: ${prefixes.join(", ")}`);
    return send(res, 200, []);
  }

  // ---- storage: private seller documents (only the seller and staff, through short-lived links)
  const ownDoc = (path) => path.startsWith(`${uid}/`);
  if (url.pathname.startsWith("/storage/v1/object/seller-docs/") && req.method === "POST") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/seller-docs/".length));
    if (!(activeSeller && ownDoc(path)) || path.includes("..")) return denied(res);
    const { bytes } = fileBytes(req, body);
    mkdirSync(dirname(join(docsDir, path)), { recursive: true });
    writeFileSync(join(docsDir, path), bytes);
    console.log(`🔒 Private document uploaded by ${me}: ${path}`);
    return send(res, 200, { Key: `seller-docs/${path}`, Id: path });
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/seller-docs/") && req.method === "POST") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/sign/seller-docs/".length));
    if (!(staff || (seller && ownDoc(path))) || !existsSync(join(docsDir, path))) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    const token = Buffer.from(JSON.stringify({ path, exp: Date.now() + (json().expiresIn ?? 60) * 1000 })).toString("base64url");
    return send(res, 200, { signedURL: `/object/sign/seller-docs/${path}?token=${token}` });
  }
  if (url.pathname.startsWith("/storage/v1/object/sign/seller-docs/") && req.method === "GET") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/sign/seller-docs/".length));
    let ok = false;
    try { const t = JSON.parse(Buffer.from(url.searchParams.get("token") ?? "", "base64url").toString()); ok = t.path === path && t.exp > Date.now(); } catch { /* bad token */ }
    if (!ok || !existsSync(join(docsDir, path))) return send(res, 400, { message: "invalid or expired link" });
    res.writeHead(200, { "content-type": mime[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
    return res.end(readFileSync(join(docsDir, path)));
  }
  if (url.pathname === "/storage/v1/object/seller-docs" && req.method === "DELETE") {
    const prefixes = json().prefixes ?? [];
    if (!(seller && prefixes.every(ownDoc))) return send(res, 403, { message: "not allowed" });
    console.log(`🗑 Private documents deleted: ${prefixes.join(", ")}`);
    return send(res, 200, []);
  }

  // ---- database functions
  if (url.pathname === "/rest/v1/rpc/track") { const e = json(); console.log(`· ${e.event_type} ${e.property_ref}`); return send(res, 204); }
  if (url.pathname === "/rest/v1/rpc/request_site_rebuild") {
    if (!staff) return send(res, 403, { code: "42501", message: "Not allowed" });
    rebuild("Update website now");
    return send(res, 204);
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) return rpc(url.pathname.slice(13), json(), res, { me, staff, uid, seller, activeSeller });

  // ---- database tables
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice(9);
    if (!db[table] || table === "demo_users" || table === "seller_sequence") return send(res, 404, { message: `relation "${table}" does not exist` });
    const fs = filters(url);
    // Same visibility rules as supabase/schema.sql.
    const visible = (r) => {
      if (staff) return true;
      if (table === "product_categories") return true;
      if (table === "properties") return isPublic(r.stage) || (uid && r.seller_id === uid);
      if (table === "products") return r.published === true;
      if (table === "seller_profiles") return r.user_id === uid;
      if (table === "seller_documents" || table === "property_revisions") return Boolean(uid) && r.seller_id === uid;
      return false; // staff, enquiries, enquiry_history, audit_log
    };
    if (req.method === "GET") {
      const found = sortRows(db[table].filter((r) => visible(r) && match(r, fs)), url.searchParams.get("order"));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return found[0] ? send(res, 200, found[0]) : send(res, 406, { code: "PGRST116", message: "no rows" });
      return send(res, 200, found);
    }
    // Like the database rules: anyone may send an enquiry (form fields only), nothing else.
    if (table === "enquiries" && req.method === "POST") {
      const r = json();
      if (Object.keys(r).some((k) => !ENQUIRY_FIELDS.includes(k)) || r.consent !== true) return send(res, 403, { code: "42501", message: "permission denied for table enquiries" });
      db.enquiries.unshift({ id: `enq-${Date.now()}`, created_at: now(), ...r, status: r.kind === "visit" ? "visit_requested" : "new",
        repeat_contact: db.enquiries.some((e) => e.phone === r.phone), assigned_to: null, follow_up_on: null, notes: null });
      save();
      console.log(`✉ New enquiry from ${r.name} (${r.phone}) — see the Enquiries tab`);
      return send(res, 201);
    }
    if (!staff) return sellerWrite(table, req.method, fs, json(), res, { me, uid, seller, activeSeller });
    if (["property_revisions", "audit_log"].includes(table)) return denied(res); // written only by the database functions
    if (table === "staff" && staff.role !== "owner") return denied(res);
    const before = table === "properties" ? db.properties.map((r) => ({ id: r.id, stage: r.stage })) : null;
    if (req.method === "POST") {
      const upsert = (req.headers.prefer ?? "").includes("merge-duplicates");
      for (const r of [].concat(JSON.parse(body))) {
        const i = db[table].findIndex((x) => x[KEYS[table]] === r[KEYS[table]]);
        if (!upsert && UNIQUE[table]) {
          const clash = UNIQUE[table].find((k) => db[table].some((x) => x[k] === r[k]));
          if (clash) return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_${clash}_key"` });
        }
        const row = { id: r.id ?? `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: now(), ...r };
        if (i >= 0) db[table][i] = { ...db[table][i], ...row }; else db[table].push(row);
        if (table === "properties" && i < 0) audit({ actor: me, property_id: row.id, action: "created" });
      }
    } else if (req.method === "PATCH") {
      const change = JSON.parse(body);
      const targets = db[table].filter((r) => match(r, fs));
      const clash = (UNIQUE[table] ?? []).find((k) => k in change && db[table].some((x) => x[k] === change[k] && !targets.includes(x)));
      if (clash) return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_${clash}_key"` });
      for (const r of targets) {
        if (table === "properties" && "stage" in change && change.stage !== r.stage) audit({ actor: me, property_id: r.id, seller_id: r.seller_id ?? null, action: "stage", detail: { from: r.stage, to: change.stage } });
        if (table === "seller_profiles" && "status" in change && change.status !== r.status) audit({ actor: me, seller_id: r.user_id, action: "seller_status", detail: { from: r.status, to: change.status } });
        Object.assign(r, change, { updated_at: now() });
      }
    } else if (req.method === "DELETE") {
      if (table === "product_categories" && db.products.some((p) => db[table].some((c) => match(c, fs) && c.id === p.category_id)))
        return send(res, 409, { code: "23503", message: "violates foreign key constraint" });
      const remaining = db[table].filter((r) => !match(r, fs));
      if (table === "staff" && !remaining.some((s) => s.role === "owner")) return send(res, 400, { message: "At least one owner must remain" });
      db[table] = remaining;
    }
    if (table === "staff" && !db.staff.some((s) => s.role === "owner")) { db = JSON.parse(readFileSync(dbFile, "utf8")); return send(res, 400, { message: "At least one owner must remain" }); }
    save();
    console.log(`✎ ${req.method === "POST" ? "Saved" : req.method === "PATCH" ? "Updated" : "Deleted"} ${table} (by ${me})`);
    if (table === "enquiries" && req.method === "PATCH") {
      const change = JSON.parse(body);
      for (const r of db.enquiries.filter((x) => match(x, fs))) for (const [field, value] of Object.entries(change))
        db.enquiry_history.push({ id: db.enquiry_history.length + 1, enquiry_id: r.id, at: now(), actor: me, field, old_value: null, new_value: field === "notes" ? null : value });
      save();
    }
    // Properties rebuild only when a row that is (or was) public changed, as in the schema.
    if (table === "properties") {
      const after = new Map(db.properties.map((r) => [r.id, r.stage]));
      const changed = [...new Set([...before.map((b) => b.id), ...after.keys()])].filter((id) => {
        const was = before.find((b) => b.id === id)?.stage;
        return was !== after.get(id) || (req.method === "PATCH" && db.properties.some((r) => r.id === id && match(r, fs)));
      });
      if (changed.some((id) => isPublic(before.find((b) => b.id === id)?.stage) || isPublic(after.get(id)))) scheduleRebuild("properties changed");
    } else if (["products", "product_categories"].includes(table)) scheduleRebuild(`${table} changed`);
    return send(res, req.method === "POST" ? 201 : 204);
  }

  // ---- the built site, with clean URLs like public/.htaccess
  const file = normalize(join(site, decodeURIComponent(url.pathname)));
  if (!file.startsWith(site)) return send(res, 403);
  for (const candidate of [file, `${file}.html`, join(file, "index.html")]) {
    try {
      const data = readFileSync(candidate);
      res.writeHead(200, { "content-type": mime[extname(candidate)] ?? "application/octet-stream", "cache-control": "no-store" });
      return res.end(data);
    } catch { /* next */ }
  }
  // Read the 404 page first: while the site is rebuilding it may not exist yet.
  let notFound = null;
  try { notFound = readFileSync(join(site, "404.html")); } catch { /* rebuilding */ }
  if (notFound) { res.writeHead(404, { "content-type": "text/html; charset=utf-8" }); return res.end(notFound); }
  return send(res, 404, { message: "Not found (the site may still be building)" });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\nDemo admin:     ${BASE}/admin   (demo@asms.local or editor@asms.local, password ${PASSWORD})\nSeller portal:  ${BASE}/seller  (sign in on the demo Google page with any email)\nPublic site:    ${BASE}/\nData is kept in ${demoDir} — delete that folder to start over. Ctrl+C to stop.\n`);
  rebuild("startup");
});

/** A seller's own writes, with the same limits as the seller policies and guard trigger. */
function sellerWrite(table, method, fs, input, res, { me, uid, seller, activeSeller }) {
  if (!uid) return denied(res);
  if (table === "seller_profiles") {
    if (method === "POST") {
      if (seller) return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint \"seller_profiles_pkey\"" });
      if (!/^[0-9+() -]{7,20}$/.test(input.phone ?? "") || !(input.name ?? "").trim() || !["owner", "broker", "developer", "other"].includes(input.seller_type)) return fail(res, "new row violates check constraint", "23514");
      db.seller_profiles.push({ user_id: uid, email: me, name: input.name.trim(), phone: input.phone.trim(), seller_type: input.seller_type, company: input.company || null, status: "active", created_at: now() });
      save(); console.log(`🙋 New seller: ${input.name} (${me})`);
      return send(res, 201);
    }
    if (method === "PATCH" && seller && fs.every(([k, v]) => k !== "user_id" || v === `eq.${uid}`)) {
      Object.assign(seller, pick(input, ["name", "phone", "seller_type", "company"]), { updated_at: now() });
      save(); return send(res, 204);
    }
    return denied(res);
  }
  if (table === "properties") {
    if (method === "POST") {
      if (!activeSeller) return denied(res);
      for (const r of [].concat(input)) {
        db.seller_sequence = (db.seller_sequence ?? 0) + 1;
        const reference = `ASMS-S${String(db.seller_sequence).padStart(4, "0")}`;
        const row = { ...BLANK_PROPERTY, ...pick(r, SELLER_FIELDS), id: r.id ?? randomUUID(), seller_id: uid, reference, slug: reference.toLowerCase(), stage: "draft", created_at: now() };
        db.properties.push(row);
        audit({ actor: me, property_id: row.id, seller_id: uid, action: "created" });
      }
      save(); console.log(`✎ Seller draft started by ${me}`);
      return send(res, 201);
    }
    const mine = db.properties.filter((r) => r.seller_id === uid && match(r, fs));
    if (method === "PATCH") {
      if (!activeSeller) return send(res, 204); // no rows match the policy
      for (const r of mine.filter((x) => ["draft", "changes_requested"].includes(x.stage))) Object.assign(r, pick(input, SELLER_FIELDS), { updated_at: now() });
      save(); return send(res, 204);
    }
    if (method === "DELETE") {
      db.properties = db.properties.filter((r) => !(mine.includes(r) && r.stage === "draft"));
      save(); return send(res, 204);
    }
  }
  if (table === "seller_documents") {
    const editable = (pid) => db.properties.some((p) => p.id === pid && p.seller_id === uid && ["draft", "changes_requested"].includes(p.stage));
    if (method === "POST") {
      const r = input;
      if (!activeSeller || r.seller_id !== uid || !String(r.path ?? "").startsWith(`${uid}/`) || !editable(r.property_id)) return denied(res);
      db.seller_documents.push({ id: r.id ?? randomUUID(), property_id: r.property_id, seller_id: uid, label: r.label, path: r.path, file_name: r.file_name ?? null, size_bytes: r.size_bytes ?? null, created_at: now() });
      save(); return send(res, 201);
    }
    if (method === "DELETE") {
      db.seller_documents = db.seller_documents.filter((d) => !(d.seller_id === uid && match(d, fs) && editable(d.property_id)));
      save(); return send(res, 204);
    }
  }
  return denied(res);
}

/** The seller-portal functions from supabase/schema.sql. */
function rpc(name, args, res, { me, staff, uid, activeSeller }) {
  const listing = db.properties.find((p) => p.id === args.listing);
  const done = (reason) => { save(); if (reason) scheduleRebuild(reason); return send(res, 204); };
  const setStage = (p, stage, note = null) => {
    if (p.stage !== stage) audit({ actor: me, property_id: p.id, seller_id: p.seller_id ?? null, action: "stage", note, detail: { from: p.stage, to: stage } });
    const wasPublic = isPublic(p.stage);
    p.stage = stage; p.updated_at = now();
    return wasPublic || isPublic(stage);
  };

  if (name === "listing_history") {
    if (!listing || !(staff || (uid && listing.seller_id === uid))) return send(res, 200, []);
    const sellerEmail = db.seller_profiles.find((s) => s.user_id === listing.seller_id)?.email;
    return send(res, 200, db.audit_log.filter((a) => a.property_id === listing.id).map((a) => ({ at: a.at, by_seller: a.actor === sellerEmail, action: a.action, note: a.note, detail: a.detail })));
  }

  if (["submit_listing", "seller_listing_action", "submit_revision"].includes(name)) {
    if (!listing || !uid || listing.seller_id !== uid) return fail(res, "Listing not found.", "P0002");
    if (name === "submit_listing") {
      if (!activeSeller) return fail(res, "Your seller account is suspended.", "42501");
      if (!["draft", "changes_requested"].includes(listing.stage)) return fail(res, "This listing has already been sent for review.");
      const missing = gaps(listing);
      if (missing.length) return fail(res, `Still needed: ${missing.join(", ")}.`);
      setStage(listing, "submitted");
      listing.submitted_at = now();
      console.log(`📨 ${listing.reference} sent for review by ${me}`);
      return done();
    }
    if (name === "seller_listing_action") {
      const { action } = args;
      if (!["pause", "sold"].includes(action) && !activeSeller) return fail(res, "Your seller account is suspended.", "42501");
      const s = listing.stage;
      const next = action === "pause" && s === "live" ? "paused" : action === "resume" && s === "paused" ? "live" : action === "sold" && ["live", "paused"].includes(s) ? "sold"
        : action === "reconfirm" && s === "live" ? "live" : action === "withdraw" && s === "submitted" ? "draft" : null;
      if (!next) return fail(res, "That isn't possible for this listing right now.");
      const changedPublic = setStage(listing, next);
      if (action === "resume" || action === "reconfirm") listing.last_confirmed_on = today();
      if (action === "reconfirm") audit({ actor: me, property_id: listing.id, seller_id: uid, action: "reconfirmed" });
      return done(changedPublic ? "seller listing changed" : null);
    }
    // submit_revision
    if (!activeSeller) return fail(res, "Your seller account is suspended.", "42501");
    if (!["live", "paused"].includes(listing.stage)) return fail(res, "Only live or paused listings take change requests.");
    const changes = Object.fromEntries(Object.entries(pick(args.changes, SELLER_FIELDS)).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(listing[k] ?? null)));
    if (Object.keys(changes).length === 0) return fail(res, "There are no changes to send.");
    const missing = gaps({ ...listing, ...changes });
    if (missing.length) return fail(res, `Still needed: ${missing.join(", ")}.`);
    for (const r of db.property_revisions) if (r.property_id === listing.id && r.status === "pending") r.status = "withdrawn";
    db.property_revisions.push({ id: randomUUID(), property_id: listing.id, seller_id: uid, changes, status: "pending", note: null, created_at: now(), reviewed_at: null, reviewed_by: null });
    audit({ actor: me, property_id: listing.id, seller_id: uid, action: "revision_submitted", detail: { fields: Object.keys(changes) } });
    console.log(`📨 Change request for ${listing.reference} from ${me}`);
    return done();
  }

  if (name === "review_listing") {
    if (!staff) return fail(res, "Not allowed", "42501", 403);
    if (!listing) return fail(res, "Listing not found.", "P0002");
    const { decision } = args;
    const note = (args.note ?? "").trim() || null;
    const s = listing.stage;
    const next = decision === "start" && s === "submitted" ? "under_review" : decision === "changes" && ["submitted", "under_review"].includes(s) ? "changes_requested"
      : decision === "reject" && ["submitted", "under_review", "changes_requested"].includes(s) ? "rejected" : decision === "approve" && ["submitted", "under_review"].includes(s) ? "live" : null;
    if (!next) return fail(res, "That decision isn't possible at this stage.");
    if (["changes", "reject"].includes(decision) && !note) return fail(res, "Write a note telling the seller why.");
    const changedPublic = setStage(listing, next, note);
    listing.review_note = ["changes", "reject"].includes(decision) ? note : null;
    if (decision === "approve") {
      listing.slug = slugify(`${listing.title} ${listing.reference}`);
      listing.posted_on = today();
      listing.last_confirmed_on = today();
      console.log(`✅ ${listing.reference} approved by ${me} — it goes on the website`);
    }
    return done(changedPublic ? "listing approved" : null);
  }

  if (name === "review_revision") {
    if (!staff) return fail(res, "Not allowed", "42501", 403);
    const r = db.property_revisions.find((x) => x.id === args.revision && x.status === "pending");
    if (!r) return fail(res, "This change request was already handled.", "P0002");
    const note = (args.note ?? "").trim() || null;
    if (!["approve", "reject"].includes(args.decision)) return fail(res, "Unknown decision.");
    if (args.decision === "reject" && !note) return fail(res, "Write a note telling the seller why.");
    const p = db.properties.find((x) => x.id === r.property_id);
    if (args.decision === "approve" && p) Object.assign(p, pick(r.changes, SELLER_FIELDS), { updated_at: now() });
    Object.assign(r, { status: args.decision === "approve" ? "approved" : "rejected", note, reviewed_at: now(), reviewed_by: me });
    audit({ actor: me, property_id: r.property_id, seller_id: r.seller_id, action: args.decision === "approve" ? "revision_approved" : "revision_rejected", note });
    return done(args.decision === "approve" && p && isPublic(p.stage) ? "change request applied" : null);
  }

  return send(res, 404, { code: "PGRST202", message: `Could not find the function public.${name}` });
}

function user(email) {
  const name = db.demo_users?.[email];
  return { id: userId(email), aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: name ? { full_name: name, name } : {}, created_at: "2026-01-01T00:00:00Z" };
}
function session(email) {
  const token = `demo.${Buffer.from(email).toString("base64url")}`;
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: token, user: user(email) };
}

// Put the committed sample content back when the demo stops.
const restore = () => { try { copyFileSync(contentBackup, contentFile); } catch { /* ignore */ } process.exit(0); };
process.on("SIGINT", restore);
process.on("SIGTERM", restore);
