#!/usr/bin/env node
// Pulls published content from Supabase into content/content.json and copies
// every referenced photo into public/media/, so the built site never depends on
// Supabase at runtime (free projects pause when idle).
//
// Env: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
// Without them it keeps the committed sample content and exits 0.
// Any fetch failure exits 1 so a broken pull never gets deployed.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = resolve(root, "public", "media");

// Same rule as private.safe_media_path() in supabase/schema.sql. Checked again here
// because each path becomes a file under public/media: a path that slipped past the
// database must not be able to write anywhere else in the build.
const SAFE_PATH = /^[a-z0-9_-]+(\/[A-Za-z0-9_-]+)*\/[A-Za-z0-9_-]+\.(webp|jpe?g|png)$/;
function mediaFile(path) {
  const file = resolve(mediaDir, path);
  if (!SAFE_PATH.test(path) || !file.startsWith(mediaDir + sep)) throw new Error(`Refusing unsafe photo path: ${JSON.stringify(path)}`);
  return file;
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("pull-content: Supabase env not set — keeping committed sample content.");
  process.exit(0);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function rows(table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// Storage path "properties/abc.webp" has a small variant "properties/abc-sm.webp".
const smallPath = (path) => path.replace(/(\.[a-z0-9]+)$/i, "-sm$1");
const downloads = new Set();
function image(path, alt) {
  if (!path) return null;
  mediaFile(path);
  downloads.add(path);
  downloads.add(smallPath(path));
  return { src: `/media/${path}`, srcSmall: `/media/${smallPath(path)}`, alt: alt ?? "" };
}

async function download(path) {
  const res = await fetch(`${url}/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`);
  if (res.status === 404 && path.includes("-sm.")) return false; // tolerate a missing small variant
  if (!res.ok) throw new Error(`media/${path}: HTTP ${res.status}`);
  const file = mediaFile(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

const [categories, products, properties] = await Promise.all([
  rows("product_categories", "select=id,name,intro,icon&order=sort_order,name"),
  rows("products", "select=*&published=is.true&order=sort_order,name"),
  rows("properties", "select=*&stage=in.(live,sold)&order=featured.desc,sort_order,posted_on.desc.nullslast,created_at.desc"),
]);

const num = (v) => (v === null || v === undefined ? null : Number(v));

const content = {
  source: "supabase",
  generatedAt: new Date().toISOString(),
  categories,
  products: products.map((p) => ({
    slug: p.slug,
    categoryId: p.category_id,
    name: p.name,
    summary: p.summary,
    specs: p.specs ?? [],
    unit: p.unit,
    suitableUse: p.suitable_use,
    availability: p.availability,
    image: p.image_path ? { ...image(p.image_path, p.image_alt || p.name), credit: p.image_credit ?? null } : null,
  })),
  properties: properties.map((p) => ({
    slug: p.slug,
    reference: p.reference,
    title: p.title,
    stage: p.stage,
    featured: p.featured,
    category: p.category,
    propertyType: p.property_type,
    transactionType: p.transaction_type,
    ownership: p.ownership,
    location: p.location,
    locality: p.locality,
    price: num(p.price),
    priceNegotiable: p.price_negotiable,
    areaSqFt: num(p.area_sqft),
    areaUnit: p.area_unit,
    dimensions: p.dimensions,
    facing: p.facing,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    carpetAreaSqFt: num(p.carpet_area_sqft),
    furnishing: p.furnishing,
    floorInfo: p.floor_info,
    parking: p.parking,
    possession: p.possession,
    roadWidthFt: num(p.road_width_ft),
    frontageFt: num(p.frontage_ft),
    landUse: p.land_use,
    cornerPlot: p.corner_plot,
    boundaryWall: p.boundary_wall,
    gatedLayout: p.gated_layout,
    floorsAllowed: p.floors_allowed,
    usableAreaSqFt: num(p.usable_area_sqft),
    accessNotes: p.access_notes,
    zoningNotes: p.zoning_notes,
    approval: p.approval,
    rera: p.rera,
    availability: p.availability,
    description: p.description,
    amenities: p.amenities ?? [],
    nearby: p.nearby ?? [],
    documents: p.documents ?? [],
    images: (p.images ?? []).map((img) => image(img.path, img.alt || p.title)).filter(Boolean),
    postedOn: p.posted_on,
    lastConfirmedOn: p.last_confirmed_on,
    mapUrl: p.map_url ?? null,
  })),
};

// Small variants that are missing fall back to the full image.
const missing = new Set();
const paths = [...downloads];
for (let i = 0; i < paths.length; i += 8) {
  const results = await Promise.all(paths.slice(i, i + 8).map(download));
  results.forEach((ok, j) => { if (!ok) missing.add(paths[i + j]); });
}
const fix = (img) => img && (missing.has(img.srcSmall.slice("/media/".length)) ? { ...img, srcSmall: img.src } : img);
content.products.forEach((p) => { p.image = fix(p.image); });
content.properties.forEach((p) => { p.images = p.images.map(fix); });

await writeFile(join(root, "content", "content.json"), JSON.stringify(content, null, 2) + "\n");
console.log(`pull-content: ${content.properties.length} properties, ${content.products.length} products, ${content.categories.length} categories, ${paths.length - missing.size} images.`);
