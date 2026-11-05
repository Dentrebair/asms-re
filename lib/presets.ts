import type { IconName } from "@/app/icons";

// Options offered by the admin forms, and the icons the public pages use for them.

export const AMENITY_PRESETS: { label: string; icon: IconName }[] = [
  { label: "Water supply", icon: "water" },
  { label: "Electricity connection", icon: "bolt" },
  { label: "Underground drainage", icon: "drain" },
  { label: "Street lights", icon: "lamp" },
  { label: "Compound wall", icon: "wall" },
  { label: "Gated entrance", icon: "gate" },
  { label: "Security / CCTV", icon: "cctv" },
  { label: "Park & open space", icon: "tree" },
  { label: "Blacktop internal roads", icon: "road" },
  { label: "Rainwater harvesting", icon: "water" },
  { label: "Power backup", icon: "bolt" },
  { label: "Covered parking", icon: "roof" },
];

export const NEARBY_GROUPS: { label: string; icon: IconName }[] = [
  { label: "Transport", icon: "bus" },
  { label: "Education", icon: "school" },
  { label: "Healthcare", icon: "hospital" },
  { label: "Daily needs", icon: "cart" },
  { label: "Other", icon: "compass" },
];

export const PROPERTY_TYPES = ["Residential plot", "Land", "Agricultural land", "Residential", "Independent house", "Villa", "Apartment", "Commercial"];
export const STATUS_LABELS = ["Available", "New listing", "Under offer", "Sold"];
export const FACINGS = ["North", "East", "South", "West", "North-East", "North-West", "South-East", "South-West"];
export const CATEGORY_ICONS: IconName[] = ["layers", "roof", "brick", "wall", "road", "bolt", "water"];

export const amenityIcon = (label: string): IconName =>
  AMENITY_PRESETS.find((a) => a.label.toLowerCase() === label.toLowerCase())?.icon ?? "shield";

export const nearbyIcon = (group: string): IconName =>
  NEARBY_GROUPS.find((g) => g.label.toLowerCase() === group.toLowerCase())?.icon ?? "compass";

export const slugify = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
