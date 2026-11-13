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
export type EnquiryStatus = "new" | "contacted" | "closed";
export type EnquiryRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string | null;
  category: string;
  interest: string | null;
  message: string;
  status: EnquiryStatus;
  notes: string | null;
};
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
  image_path: string | null;
  image_alt: string | null;
  published: boolean;
  sort_order: number;
  updated_at?: string;
};

export type PropertyRow = {
  id?: string;
  slug: string;
  reference: string;
  title: string;
  published: boolean;
  featured: boolean;
  status_label: string;
  property_type: string;
  transaction_type: string | null;
  ownership: string | null;
  location: string;
  locality: string | null;
  price: number | null;
  area_sqft: number | null;
  dimensions: string | null;
  facing: string | null;
  road_width: string | null;
  approval: string | null;
  rera: string | null;
  corner_plot: boolean | null;
  boundary_wall: boolean | null;
  gated_layout: boolean | null;
  floors_allowed: string | null;
  availability: string | null;
  description: string | null;
  amenities: string[];
  nearby: { group: string; name: string; distance: string }[];
  documents: { label: string; status: string }[];
  images: ImageRef[];
  posted_on: string | null;
  sort_order: number;
  updated_at?: string;
};

export const emptyProperty = (): PropertyRow => ({
  slug: "", reference: "", title: "", published: false, featured: false, status_label: "Available",
  property_type: "Residential plot", transaction_type: null, ownership: null, location: "", locality: null,
  price: null, area_sqft: null, dimensions: null, facing: null, road_width: null, approval: null, rera: null,
  corner_plot: null, boundary_wall: null, gated_layout: null, floors_allowed: null, availability: null,
  description: null, amenities: [], nearby: [], documents: [], images: [],
  posted_on: new Date().toISOString().slice(0, 10), sort_order: 0,
});

export const emptyProduct = (categoryId = ""): ProductRow => ({
  slug: "", category_id: categoryId, name: "", summary: "", specs: [], unit: "", image_path: null, image_alt: null, published: false, sort_order: 0,
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
