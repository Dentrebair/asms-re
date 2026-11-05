// Fake Supabase (auth + PostgREST + storage) for driving the admin panel in a browser.
// Records every write in /__log so the test can assert on what the UI sent.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const [, , staticRoot, webpPath] = process.argv;
const webp = readFileSync(webpPath);
const log = [];
const db = {
  staff: [{ email: "owner@asms.test", name: "Owner", role: "owner", created_at: "2026-01-01" }],
  product_categories: [{ id: "steel-peb", name: "Structural steel & PEB", intro: "Steel.", icon: "layers", sort_order: 1 }],
  products: [],
  properties: [],
};
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { ...cors, "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
};
const read = (req) => new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
const filters = (url) => [...url.searchParams].filter(([k]) => !["select", "order", "limit", "columns"].includes(k));
const match = (row, fs) => fs.every(([k, v]) => v.startsWith("eq.") ? String(row[k]) === decodeURIComponent(v.slice(3)) : v.startsWith("in.(") ? v.slice(4, -1).split(",").map((x) => x.replace(/^"|"$/g, "")).includes(String(row[k])) : true);
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204);
  const body = await read(req);

  if (url.pathname === "/__log") return send(res, 200, { log, db });

  // ---- auth
  if (url.pathname === "/auth/v1/token") {
    const { email, password } = JSON.parse(body);
    log.push({ op: "login", email });
    if (password !== "correct-horse") return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials", code: "invalid_credentials", msg: "Invalid login credentials" });
    const user = { id: "u1", aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" };
    return send(res, 200, { access_token: "fake.jwt.token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r1", user });
  }
  if (url.pathname === "/auth/v1/logout") { log.push({ op: "logout" }); return send(res, 204); }
  if (url.pathname === "/auth/v1/user") return send(res, 200, { id: "u1", email: "owner@asms.test", aud: "authenticated" });

  // ---- storage
  if (url.pathname.startsWith("/storage/v1/object/public/media/")) { res.writeHead(200, { ...cors, "content-type": "image/webp" }); return res.end(webp); }
  if (url.pathname.startsWith("/storage/v1/object/media/") && req.method === "POST") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/media/".length));
    log.push({ op: "upload", path, bytes: body.length, type: req.headers["content-type"]?.split(";")[0] });
    return send(res, 200, { Key: `media/${path}`, Id: path });
  }
  if (url.pathname === "/storage/v1/object/media" && req.method === "DELETE") {
    log.push({ op: "storage-delete", prefixes: JSON.parse(body).prefixes });
    return send(res, 200, []);
  }

  // ---- PostgREST
  if (url.pathname === "/rest/v1/rpc/request_site_rebuild") { log.push({ op: "rpc-rebuild" }); return send(res, 204); }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice(9);
    const rows = db[table];
    if (!rows) return send(res, 404, { message: "no table" });
    const fs = filters(url);
    if (req.method === "GET") {
      const found = rows.filter((r) => match(r, fs));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return found[0] ? send(res, 200, found[0]) : send(res, 406, { code: "PGRST116", message: "no rows" });
      return send(res, 200, found);
    }
    if (req.method === "POST") {
      const input = [].concat(JSON.parse(body));
      const upsert = (req.headers.prefer ?? "").includes("merge-duplicates");
      log.push({ op: upsert ? "upsert" : "insert", table, rows: input });
      for (const r of input) {
        const key = table === "staff" ? "email" : table === "product_categories" ? "id" : "slug";
        const i = rows.findIndex((x) => x[key] === r[key]);
        if (i >= 0 && !upsert) return send(res, 409, { code: "23505", message: `duplicate key value violates unique constraint "${table}_${key}_key"` });
        const row = { id: r.id ?? `id-${rows.length + 1}`, created_at: new Date().toISOString(), ...r };
        if (i >= 0) rows[i] = { ...rows[i], ...row }; else rows.push(row);
      }
      return send(res, 201);
    }
    if (req.method === "PATCH") {
      const change = JSON.parse(body);
      log.push({ op: "update", table, filter: fs, change });
      rows.filter((r) => match(r, fs)).forEach((r) => Object.assign(r, change));
      return send(res, 204);
    }
    if (req.method === "DELETE") {
      log.push({ op: "delete", table, filter: fs });
      db[table] = rows.filter((r) => !match(r, fs));
      return send(res, 204);
    }
  }

  // ---- static site (dist/client), with clean URLs like the .htaccess
  let file = normalize(join(staticRoot, url.pathname));
  if (!file.startsWith(staticRoot)) return send(res, 403);
  for (const candidate of [file, `${file}.html`, join(file, "index.html")]) {
    try {
      const data = readFileSync(candidate);
      res.writeHead(200, { "content-type": mime[extname(candidate)] ?? "application/octet-stream" });
      return res.end(data);
    } catch { /* try next */ }
  }
  send(res, 404, { message: "not found" });
}).listen(54401, "127.0.0.1", () => console.log("mock backend on :54401"));
