#!/usr/bin/env node
// Local demo: the real site + admin panel against a fake Supabase, no account needed.
//   npm run demo   →   http://localhost:54401/admin   (demo@asms.local / demo1234)
//
// Fakes Supabase auth, database (PostgREST) and photo storage in one process,
// keeps data in .demo/ (git-ignored), and — like the real setup — rebuilds the
// public site a few seconds after every change so you can see edits live.
// content/content.json is restored to the committed sample when you stop it.

import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 54401;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = "demo1234";
const demoDir = join(root, ".demo");
const mediaDir = join(demoDir, "media");
const dbFile = join(demoDir, "db.json");
const contentFile = join(root, "content", "content.json");
const contentBackup = join(demoDir, "content.sample.json");
const site = join(root, "dist", "client");
mkdirSync(mediaDir, { recursive: true });
if (!existsSync(contentBackup)) copyFileSync(contentFile, contentBackup);

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
      image_path: local(p.image?.src), image_alt: null, published: false, sort_order: i, created_at: new Date().toISOString(),
    })),
    properties: [{
      id: "prop-1", slug: plot.slug, reference: plot.reference, title: plot.title, published: true, featured: true,
      status_label: "Available", property_type: plot.propertyType, transaction_type: plot.transactionType, ownership: plot.ownership,
      location: plot.location, locality: plot.locality, price: plot.price, area_sqft: plot.areaSqFt, dimensions: plot.dimensions,
      facing: plot.facing, road_width: plot.roadWidth, approval: plot.approval, rera: plot.rera, corner_plot: plot.cornerPlot,
      boundary_wall: plot.boundaryWall, gated_layout: plot.gatedLayout, floors_allowed: plot.floorsAllowed, availability: plot.availability,
      description: plot.description, amenities: plot.amenities, nearby: plot.nearby, documents: plot.documents,
      images: [{ path: "properties/demo-hero.webp", alt: plot.images[0].alt }], posted_on: plot.postedOn, sort_order: 0,
      created_at: new Date().toISOString(),
    }],
  };
}
// Built-in photos for seeded rows (uploads go to .demo/media).
const builtin = (path) => {
  const p = path.replace(/-sm(\.[a-z]+)$/, "$1");
  if (p === "properties/demo-hero.webp") return join(root, "public", "asms-hero.webp");
  if (p.startsWith("products/") && existsSync(join(root, "public", p))) return join(root, "public", p);
  return null;
};

let db = existsSync(dbFile) ? JSON.parse(readFileSync(dbFile, "utf8")) : seed();
const save = () => writeFileSync(dbFile, JSON.stringify(db, null, 1));
save();

// --------------------------------------------------------------- rebuild --
let timer = null, building = false, again = false;
function scheduleRebuild(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => rebuild(reason), 2500);
}
function rebuild(reason) {
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
const read = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
const KEYS = { staff: "email", product_categories: "id", products: "slug", properties: "slug" };
const UNIQUE = { properties: ["slug", "reference"], products: ["slug"], staff: ["email"], product_categories: ["id"] };
const filters = (url) => [...url.searchParams].filter(([k]) => !["select", "order", "limit", "columns", "on_conflict"].includes(k));
const unquote = (v) => decodeURIComponent(v).replace(/^"|"$/g, "");
const match = (row, fs) => fs.every(([k, v]) => {
  if (v.startsWith("eq.")) return String(row[k]) === unquote(v.slice(3));
  if (v.startsWith("is.")) return String(row[k]) === v.slice(3);
  if (v.startsWith("in.(")) return v.slice(4, -1).split(",").map(unquote).includes(String(row[k]));
  return true;
});
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".rsc": "text/x-component" };

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

createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  if (req.method === "OPTIONS") return send(res, 204);
  const body = await read(req);

  // ---- auth
  if (url.pathname === "/auth/v1/token") {
    const params = JSON.parse(body || "{}");
    if (url.searchParams.get("grant_type") === "refresh_token") {
      const email = emailFrom(params.refresh_token);
      if (!email) return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token", code: "refresh_token_not_found" });
      return send(res, 200, session(email));
    }
    if (params.password !== PASSWORD) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", code: "invalid_credentials", msg: "Invalid login credentials" });
    return send(res, 200, session(params.email.toLowerCase()));
  }
  if (url.pathname === "/auth/v1/recover") { console.log(`✉ (demo) password reset requested for ${JSON.parse(body).email} — password is always ${PASSWORD}`); return send(res, 200, {}); }
  if (url.pathname === "/auth/v1/logout") return send(res, 204);
  if (url.pathname === "/auth/v1/user") {
    const email = emailFrom((req.headers.authorization ?? "").replace("Bearer ", ""));
    if (!email) return send(res, 401, { message: "not signed in" });
    return send(res, 200, user(email));
  }
  const me = emailFrom((req.headers.authorization ?? "").replace("Bearer ", ""));
  const staff = me && db.staff.find((s) => s.email === me);

  // ---- storage
  if (url.pathname.startsWith("/storage/v1/object/public/media/")) {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/public/media/".length));
    const file = existsSync(join(mediaDir, path)) ? join(mediaDir, path) : builtin(path);
    if (!file || !existsSync(file)) return send(res, 404, { message: "Object not found" });
    res.writeHead(200, { ...cors, "content-type": mime[extname(file)] ?? "image/webp" });
    return res.end(readFileSync(file));
  }
  if (url.pathname.startsWith("/storage/v1/object/media/") && req.method === "POST") {
    if (!staff) return send(res, 403, { message: "new row violates row-level security policy" });
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/media/".length));
    const { bytes } = fileBytes(req, body);
    mkdirSync(dirname(join(mediaDir, path)), { recursive: true });
    writeFileSync(join(mediaDir, path), bytes);
    console.log(`⇪ Photo uploaded: ${path} (${Math.round(bytes.length / 1024)} KB)`);
    return send(res, 200, { Key: `media/${path}`, Id: path });
  }
  if (url.pathname === "/storage/v1/object/media" && req.method === "DELETE") {
    if (!staff) return send(res, 403, { message: "not allowed" });
    console.log(`🗑 Photos deleted: ${JSON.parse(body).prefixes.join(", ")}`);
    return send(res, 200, []);
  }

  // ---- database
  if (url.pathname === "/rest/v1/rpc/request_site_rebuild") {
    if (!staff) return send(res, 403, { code: "42501", message: "Not allowed" });
    rebuild("Update website now");
    return send(res, 204);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice(9);
    if (!db[table]) return send(res, 404, { message: `relation "${table}" does not exist` });
    const fs = filters(url);
    // Same visibility rules as supabase/schema.sql.
    const visible = (r) => staff ? true : table === "product_categories" ? true : table === "staff" ? false : r.published === true;
    if (req.method === "GET") {
      const found = db[table].filter((r) => visible(r) && match(r, fs));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return found[0] ? send(res, 200, found[0]) : send(res, 406, { code: "PGRST116", message: "no rows" });
      return send(res, 200, found);
    }
    const canWrite = staff && (table !== "staff" || staff.role === "owner");
    if (!canWrite) return send(res, 403, { code: "42501", message: "new row violates row-level security policy" });
    if (req.method === "POST") {
      const upsert = (req.headers.prefer ?? "").includes("merge-duplicates");
      for (const r of [].concat(JSON.parse(body))) {
        const i = db[table].findIndex((x) => x[KEYS[table]] === r[KEYS[table]]);
        if (!upsert) {
          const clash = UNIQUE[table].find((k) => db[table].some((x) => x[k] === r[k]));
          if (clash) return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_${clash}_key"` });
        }
        const row = { id: r.id ?? `${table}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, created_at: new Date().toISOString(), ...r };
        if (i >= 0) db[table][i] = { ...db[table][i], ...row }; else db[table].push(row);
      }
    } else if (req.method === "PATCH") {
      const change = JSON.parse(body);
      const targets = db[table].filter((r) => match(r, fs));
      const clash = UNIQUE[table].find((k) => k in change && db[table].some((x) => x[k] === change[k] && !targets.includes(x)));
      if (clash) return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_${clash}_key"` });
      targets.forEach((r) => Object.assign(r, change, { updated_at: new Date().toISOString() }));
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
    if (table !== "staff") scheduleRebuild(`${table} changed`);
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
  try { res.writeHead(404, { "content-type": "text/html" }); res.end(readFileSync(join(site, "404.html"))); } catch { send(res, 404); }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`\nDemo admin:  ${BASE}/admin\nPublic site: ${BASE}/\nLog in with  demo@asms.local  (owner)  or  editor@asms.local  (editor), password ${PASSWORD}\nData is kept in .demo/ — delete that folder to start over. Ctrl+C to stop.\n`);
  rebuild("startup");
});

function user(email) {
  return { id: `user-${email}`, aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
}
function session(email) {
  const token = `demo.${Buffer.from(email).toString("base64url")}`;
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: token, user: user(email) };
}

// Put the committed sample content back when the demo stops.
const restore = () => { try { copyFileSync(contentBackup, contentFile); } catch { /* ignore */ } process.exit(0); };
process.on("SIGINT", restore);
process.on("SIGTERM", restore);
