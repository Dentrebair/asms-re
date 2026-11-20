#!/usr/bin/env node
// Writes dist/client/sitemap.xml after the build: every public page, every
// live or sold property and every product. Drafts are never built, so they
// can never be listed. Base URL: NEXT_PUBLIC_SITE_URL (default asmsrounaqh.com).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://asmsrounaqh.com").replace(/\/$/, "");
const content = JSON.parse(await readFile(join(root, "content", "content.json"), "utf8"));

const pages = ["/", "/properties", "/products", "/sell", "/rentals", "/event-offer", "/services", "/about", "/contact", "/privacy", "/terms", "/disclaimer"].map((path) => ({ path }));
const properties = content.properties.map((p) => ({ path: `/properties/${p.slug}`, lastmod: p.lastConfirmedOn ?? p.postedOn }));
const products = content.products.map((p) => ({ path: `/products/${p.slug}` }));

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...pages, ...properties, ...products].map(({ path, lastmod }) => `  <url><loc>${escape(base + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
await writeFile(join(root, "dist", "client", "sitemap.xml"), xml);
console.log(`sitemap: ${pages.length + properties.length + products.length} URLs`);
