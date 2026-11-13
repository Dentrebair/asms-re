import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

// Checks the static export (dist/client) that gets uploaded to Hostinger,
// against whatever content the build used (sample data or Supabase).
const out = new URL("../dist/client/", import.meta.url);
const page = (file) => readFile(new URL(file, out), "utf8");
const content = JSON.parse(await readFile(new URL("../content/content.json", import.meta.url), "utf8"));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/&/g, "&(amp;)?");

const pages = [
  ["index.html", /Chennai plots, homes and building supplies\./],
  ["properties.html", /Property for sale around Chennai/],
  ["products.html", /Steel, roofing and concrete products/],
  ["contact.html", /Tell us what you are looking for\./],
  ["privacy.html", /What we collect/],
  ["404.html", /./],
  ["admin.html", /<meta name="robots" content="noindex, nofollow"/],
];

for (const [file, expected] of pages) {
  test(`exports ${file}`, async () => {
    const html = await page(file);
    assert.match(html, expected);
    assert.doesNotMatch(html, /openai|chatgpt|codex/i);
  });
}

test("exports a page for every property, with its own details", async () => {
  for (const p of content.properties) {
    const html = await page(`properties/${p.slug}.html`);
    assert.match(html, new RegExp(escape(p.title)), p.slug);
    assert.match(html, new RegExp(escape(p.reference)), p.slug);
    if (p.amenities.length) assert.match(html, /Amenities &amp; infrastructure/, p.slug);
    if (p.price && p.stage === "live") assert.match(html, /Estimate your EMI/, p.slug);
    else assert.doesNotMatch(html, /Estimate your EMI/, p.slug);
    if (p.stage === "sold") {
      assert.match(html, /This property has been sold/, p.slug);
      assert.doesNotMatch(html, /Enquire about property/, p.slug);
    }
  }
  const listing = await page("properties.html");
  for (const p of content.properties) {
    if (p.stage === "live") assert.match(listing, new RegExp(`href="/properties/${p.slug}"`));
    else assert.doesNotMatch(listing, new RegExp(`href="/properties/${p.slug}"`), `${p.slug} is ${p.stage} and must stay out of search`);
  }
});

test("exports a page for every product, linked from the catalogue", async () => {
  const listing = await page("products.html");
  for (const p of content.products) {
    const html = await page(`products/${p.slug}.html`);
    assert.match(html, new RegExp(escape(p.name)), p.slug);
    for (const spec of p.specs) assert.match(html, new RegExp(escape(spec.value)), `${p.slug} ${spec.label}`);
    assert.match(listing, new RegExp(`href="/products/${p.slug}"`), p.slug);
  }
});

test("products page lists every product and ships its photos", async () => {
  const html = await page("products.html");
  for (const p of content.products) assert.match(html, new RegExp(escape(p.name)), p.name);
  const local = content.products.map((p) => p.image?.srcSmall).filter((src) => src?.startsWith("/"));
  await Promise.all(local.map((src) => access(new URL(src.slice(1), out))));
});

test("sample notices appear only with sample content", async () => {
  const html = await page("properties.html");
  if (content.source === "sample") assert.match(html, /Design preview/);
  else assert.doesNotMatch(html, /Design preview/);
});

test("ships the Hostinger .htaccess", async () => {
  assert.match(await page(".htaccess"), /RewriteRule \^\(\.\+\)\$ \/\$1\.html/);
});
