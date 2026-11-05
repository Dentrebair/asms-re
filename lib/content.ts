import data from "@/content/content.json";
import type { PropertyRecord, SiteContent } from "./content-types";
import { formatINR, formatINRShort } from "./format";

export type * from "./content-types";

const content = data as SiteContent;

export const HERO_IMAGE = "/asms-hero.webp";

/** True while the site shows the committed sample data instead of Supabase content. */
export const isSample = content.source === "sample";

export const properties = content.properties;

export const featuredProperties = (() => {
  const featured = properties.filter((p) => p.featured);
  return (featured.length ? featured : properties).slice(0, 3);
})();

export const getProperty = (slug: string) => properties.find((p) => p.slug === slug);

export const similarProperties = (slug: string) => {
  const current = getProperty(slug);
  const others = properties.filter((p) => p.slug !== slug);
  const sameType = others.filter((p) => p.propertyType === current?.propertyType);
  return [...sameType, ...others.filter((p) => !sameType.includes(p))].slice(0, 3);
};

export const productCategories = content.categories
  .map((category) => ({ ...category, products: content.products.filter((p) => p.categoryId === category.id) }))
  .filter((category) => category.products.length > 0);

export const productCount = productCategories.reduce((total, c) => total + c.products.length, 0);

export const priceLabel = (p: PropertyRecord) => (p.price ? formatINRShort(p.price) : "Price on request");

export const pricePerSqFt = (p: PropertyRecord) => (p.price && p.areaSqFt ? formatINR(p.price / p.areaSqFt) : null);

export const areaLabel = (p: PropertyRecord) =>
  p.areaSqFt ? `${p.areaSqFt.toLocaleString("en-IN")} sq ft` : p.dimensions ?? "Area on request";
