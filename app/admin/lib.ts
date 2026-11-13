"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ----------------------------------------------------------------- client --
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!isConfigured) throw new Error("Supabase is not configured");
  client ??= createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, detectSessionInUrl: true } });
  return client;
}

// --------------------------------------------------------------- db types --
export type StaffRow = { email: string; name: string | null; role: "owner" | "editor"; created_at?: string };
export type EnquiryStatus = "new" | "contacted" | "qualified" | "visit_requested" | "negotiation" | "closed_won" | "closed_lost" | "not_interested";
export type EnquiryRow = {
  id: string;
  created_at: string;
  kind: "property" | "visit" | "product" | "sell" | "general";
  source: "contact_page" | "property_page" | "product_page";
  name: string;
  phone: string;
  email: string | null;
  property_ref: string | null;
  property_id: string | null;
  product_slug: string | null;
  interest: string | null;
  message: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  organisation: string | null;
  quantity: string | null;
  delivery_location: string | null;
  repeat_contact: boolean;
  status: EnquiryStatus;
  assigned_to: string | null;
  follow_up_on: string | null;
  notes: string | null;
};
export type EnquiryHistoryRow = { id: number; enquiry_id: string; at: string; actor: string | null; field: string; old_value: string | null; new_value: string | null };
export type CategoryRow = { id: string; name: string; intro: string; icon: string; sort_order: number };
export type ImageRef = { path: string; alt: string };

export type ProductRow = {
  id?: string;
  slug: string;
  category_id: string;
  name: string;
  summary: string;
  specs: { label: string; value: string }[];
  unit: string;
  suitable_use: string | null;
  availability: string | null;
  image_path: string | null;
  image_alt: string | null;
  published: boolean;
  sort_order: number;
  updated_at?: string;
};

export type PropertyStage = "draft" | "submitted" | "under_review" | "changes_requested" | "rejected" | "approved" | "live" | "paused" | "sold" | "expired" | "archived";

export type PropertyRow = {
  id?: string;
  slug: string;
  reference: string;
  title: string;
  stage: PropertyStage;
  featured: boolean;
  category: "residential" | "plot" | "commercial" | "agricultural";
  property_type: string;
  transaction_type: string | null;
  ownership: string | null;
  location: string;
  locality: string | null;
  price: number | null;
  price_negotiable: boolean | null;
  area_sqft: number | null;
  area_unit: "sqft" | "sqyd" | "cent" | "acre";
  dimensions: string | null;
  facing: string | null;
  bhk: number | null;
  bathrooms: number | null;
  carpet_area_sqft: number | null;
  furnishing: string | null;
  floor_info: string | null;
  parking: string | null;
  possession: string | null;
  road_width_ft: number | null;
  frontage_ft: number | null;
  land_use: string | null;
  corner_plot: boolean | null;
  boundary_wall: boolean | null;
  gated_layout: boolean | null;
  floors_allowed: string | null;
  usable_area_sqft: number | null;
  access_notes: string | null;
  zoning_notes: string | null;
  approval: string | null;
  rera: string | null;
  availability: string | null;
  description: string | null;
  amenities: string[];
  nearby: { group: string; name: string; distance: string }[];
  documents: { label: string; status: string }[];
  images: ImageRef[];
  posted_on: string | null;
  last_confirmed_on: string | null;
  sort_order: number;
  updated_at?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export const emptyProperty = (): PropertyRow => ({
  slug: "", reference: "", title: "", stage: "draft", featured: false, category: "plot",
  property_type: "Residential plot", transaction_type: null, ownership: null, location: "", locality: null,
  price: null, price_negotiable: null, area_sqft: null, area_unit: "sqft", dimensions: null, facing: null,
  bhk: null, bathrooms: null, carpet_area_sqft: null, furnishing: null, floor_info: null, parking: null, possession: null,
  road_width_ft: null, frontage_ft: null, land_use: null, corner_plot: null, boundary_wall: null, gated_layout: null, floors_allowed: null,
  usable_area_sqft: null, access_notes: null, zoning_notes: null, approval: null, rera: null, availability: null,
  description: null, amenities: [], nearby: [], documents: [], images: [],
  posted_on: today(), last_confirmed_on: today(), sort_order: 0,
});

export const emptyProduct = (categoryId = ""): ProductRow => ({
  slug: "", category_id: categoryId, name: "", summary: "", specs: [], unit: "", suitable_use: null, availability: null, image_path: null, image_alt: null, published: false, sort_order: 0,
});

/** Turns a Supabase/PostgREST error into a sentence staff can act on. */
export function explain(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong.";
  const m = error.message ?? "";
  if (error.code === "23505" || /duplicate key/.test(m)) {
    if (/reference/.test(m)) return "Another property already uses this reference.";
    if (/slug/.test(m)) return "Another item already uses this web address (slug). Change the slug.";
    if (/staff_pkey/.test(m)) return "That email is already on the staff list.";
    return "This would create a duplicate.";
  }
  if (error.code === "23503" || /foreign key/.test(m)) return "This category still has products. Move or delete them first.";
  if (error.code === "42501" || /row-level security|permission denied|Not allowed/.test(m)) return "You don’t have permission to do that.";
  if (/At least one owner/.test(m)) return "There must always be at least one owner.";
  if (/check constraint/.test(m)) return "Some values aren’t valid (check slug, price and area).";
  if (/Failed to fetch|NetworkError/.test(m)) return "Can’t reach the server. Check your internet connection.";
  return m || "Something went wrong.";
}

// ------------------------------------------------------------------ media --
const BUCKET = "media";

export const smallPath = (path: string) => path.replace(/(\.[a-z0-9]+)$/i, "-sm$1");

export const mediaUrl = (path: string, small = true) =>
  supabase().storage.from(BUCKET).getPublicUrl(small ? smallPath(path) : path).data.publicUrl;

async function resize(file: File, maxWidth: number): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`Couldn’t read “${file.name}”. Please use a JPG, PNG or WebP photo.`);
  }
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  // Browsers that can't encode WebP fall back to JPEG.
  if (blob && blob.type === "image/webp") return blob;
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn’t process the photo."))), "image/jpeg", 0.85));
}

/** Resizes a photo to a 1600px and an 800px version and uploads both. Returns the storage path. */
export async function uploadPhoto(file: File, folder: "properties" | "products"): Promise<string> {
  const [large, small] = await Promise.all([resize(file, 1600), resize(file, 800)]);
  const ext = large.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bucket = supabase().storage.from(BUCKET);
  const options = { contentType: large.type, cacheControl: "31536000", upsert: false };
  const first = await bucket.upload(path, large, options);
  if (first.error) throw new Error(explain(first.error));
  const second = await bucket.upload(smallPath(path), small, { ...options, contentType: small.type });
  if (second.error) {
    await bucket.remove([path]);
    throw new Error(explain(second.error));
  }
  return path;
}

export async function deletePhotos(paths: string[]) {
  if (paths.length === 0) return;
  await supabase().storage.from(BUCKET).remove(paths.flatMap((p) => [p, smallPath(p)]));
}
