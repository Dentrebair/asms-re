import type { AreaUnit, PropertyCategory, PropertyRecord } from "./content-types";

// Property categories (PRD section 6 type tabs) and their buyer-facing names.
export const CATEGORIES: { id: PropertyCategory; label: string; tab: string }[] = [
  { id: "residential", label: "Residential", tab: "Apartments and houses" },
  { id: "plot", label: "Plot or land", tab: "Plots and land" },
  { id: "commercial", label: "Commercial", tab: "Commercial" },
  { id: "agricultural", label: "Agricultural land", tab: "Agricultural" },
];

export const SUBTYPES: Record<PropertyCategory, string[]> = {
  residential: ["Apartment", "Independent house", "Villa"],
  plot: ["Residential plot", "Land"],
  commercial: ["Office", "Retail shop", "Showroom", "Warehouse", "Industrial shed", "Commercial building", "Commercial land", "Educational campus"],
  agricultural: ["Agricultural land", "Farm land"],
};

export const categoryLabel = (c: PropertyCategory) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

// Area is stored in sq ft. A cent (common in Tamil Nadu) is 435.6 sq ft.
export const AREA_UNITS: { id: AreaUnit; label: string; sqft: number }[] = [
  { id: "sqft", label: "sq ft", sqft: 1 },
  { id: "sqyd", label: "sq yd", sqft: 9 },
  { id: "cent", label: "cents", sqft: 435.6 },
  { id: "acre", label: "acres", sqft: 43560 },
];

const unit = (u: AreaUnit) => AREA_UNITS.find((x) => x.id === u) ?? AREA_UNITS[0];
const trim = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en-IN") : (+n.toFixed(2)).toLocaleString("en-IN"));

/** Area in the listing's own unit, e.g. "2.5 acres" or "1,200 sq ft". */
export function areaIn(sqft: number, u: AreaUnit) {
  const x = unit(u);
  return `${trim(sqft / x.sqft)} ${x.label}`;
}

/** Area with its sq ft conversion when shown in another unit, e.g. "2.5 acres (1,08,900 sq ft)". */
export function areaWithConversion(sqft: number, u: AreaUnit) {
  return u === "sqft" ? areaIn(sqft, "sqft") : `${areaIn(sqft, u)} (${areaIn(sqft, "sqft")})`;
}

export const areaLabel = (p: Pick<PropertyRecord, "areaSqFt" | "areaUnit" | "dimensions">) =>
  p.areaSqFt ? areaIn(p.areaSqFt, p.areaUnit) : p.dimensions ?? "Area on request";

/** Tag on a card: Sold, New listing (first 14 days) or nothing. */
export function listingTag(p: Pick<PropertyRecord, "stage" | "postedOn">, today = new Date()) {
  if (p.stage === "sold") return "Sold";
  if (p.postedOn && today.getTime() - Date.parse(p.postedOn) < 14 * 864e5) return "New listing";
  return null;
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The facts a buyer of this category decides on (PRD section 7), only those that are filled in. */
export function keySpecs(p: PropertyRecord): [string, string][] {
  const ft = (n: number | null) => (n ? `${trim(n)} ft` : null);
  const sq = (n: number | null) => (n ? areaIn(n, "sqft") : null);
  const yes = (b: boolean | null) => (b === null ? null : b ? "Yes" : "No");
  const rows: [string, string | null][] =
    p.category === "residential" ? [
      ["Bedrooms", p.bhk ? `${p.bhk} BHK` : null],
      ["Bathrooms", p.bathrooms ? String(p.bathrooms) : null],
      ["Carpet area", sq(p.carpetAreaSqFt)],
      ["Built-up area", p.areaSqFt ? areaWithConversion(p.areaSqFt, p.areaUnit) : null],
      ["Floor", p.floorInfo],
      ["Furnishing", p.furnishing],
      ["Parking", p.parking],
      ["Possession", p.possession],
      ["Facing", p.facing],
    ] : p.category === "commercial" ? [
      ["Type", p.propertyType],
      ["Total area", p.areaSqFt ? areaWithConversion(p.areaSqFt, p.areaUnit) : null],
      ["Usable area", sq(p.usableAreaSqFt)],
      ["Floor", p.floorInfo],
      ["Parking", p.parking],
      ["Access", p.accessNotes],
      ["Zoning", p.zoningNotes],
      ["Possession", p.possession],
    ] : [
      ["Plot area", p.areaSqFt ? areaWithConversion(p.areaSqFt, p.areaUnit) : null],
      ["Dimensions", p.dimensions],
      ["Frontage", ft(p.frontageFt)],
      ["Road width", ft(p.roadWidthFt)],
      ["Facing", p.facing],
      ["Land use", p.landUse],
      ["Corner plot", yes(p.cornerPlot)],
      ["Boundary wall", yes(p.boundaryWall)],
      ["Gated layout", yes(p.gatedLayout)],
      ["Floors allowed", p.floorsAllowed],
    ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}
