"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatINR, formatINRShort } from "@/lib/format";
import { AMENITY_PRESETS, FACINGS, NEARBY_GROUPS } from "@/lib/presets";
import { AREA_UNITS, CATEGORIES, SUBTYPES, areaIn } from "@/lib/property";
import type { PropertyRow } from "./lib";
import { Check, NumberInput, Rows, Select, Text, TextArea, YesNo } from "./ui";

/**
 * The listing's own fields, shared by the staff property editor and the seller wizard,
 * so both ask for the same facts with the same labels.
 */
export type ListingProps = {
  p: PropertyRow;
  set: <K extends keyof PropertyRow>(key: K, value: PropertyRow[K]) => void;
  setP: Dispatch<SetStateAction<PropertyRow>>;
};

const unitOf = (p: PropertyRow) => AREA_UNITS.find((u) => u.id === p.area_unit) ?? AREA_UNITS[0];

/** Category and property type; changing the category keeps the type only if it still fits. */
export function CategorySelects({ p, set, setP }: ListingProps) {
  return (
    <>
      <Select label="Category" value={p.category} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} required
        onChange={(v) => { const c = (v ?? "plot") as PropertyRow["category"]; setP((cur) => ({ ...cur, category: c, property_type: SUBTYPES[c].includes(cur.property_type) ? cur.property_type : SUBTYPES[c][0] })); }} />
      <Select label="Property type" value={p.property_type} options={SUBTYPES[p.category]} onChange={(v) => set("property_type", v ?? SUBTYPES[p.category][0])} required />
    </>
  );
}

export function LocationSection({ p, set }: ListingProps) {
  return (
    <fieldset id="sec-location"><legend>Location</legend>
      <Text label="Location" value={p.location} onChange={(v) => set("location", v ?? "")} required grow placeholder="e.g. Tambaram, Chennai" />
      <Text label="Locality / landmark" value={p.locality} onChange={(v) => set("locality", v)} placeholder="e.g. Near Tambaram railway station" />
      <Text label="Google Maps link" value={p.map_url} onChange={(v) => set("map_url", v)} hint="Paste the share link from Google Maps (starts with https://)" placeholder="https://maps.app.goo.gl/…" />
    </fieldset>
  );
}

export function PriceSizeSection({ p, set }: ListingProps) {
  const unit = unitOf(p);
  return (
    <fieldset id="sec-price-and-size"><legend>Price &amp; size</legend>
      <NumberInput label="Price (₹)" value={p.price} onChange={(v) => set("price", v === null ? null : Math.round(v))} placeholder="Leave empty for “Price on request”"
        hint={p.price ? `${formatINRShort(p.price)} · ${formatINR(p.price)}${p.area_sqft ? ` · ${formatINR(p.price / p.area_sqft)}/sq ft` : ""}` : "Empty = “Price on request”"} />
      <YesNo label="Price negotiable" value={p.price_negotiable} onChange={(v) => set("price_negotiable", v)} />
      <Select label="Show area in" value={p.area_unit} options={AREA_UNITS.map((u) => ({ value: u.id, label: u.label }))} onChange={(v) => set("area_unit", (v ?? "sqft") as PropertyRow["area_unit"])} required />
      <NumberInput label={`${p.category === "residential" ? "Built-up area" : "Area"} (${unit.label})`}
        value={p.area_sqft === null ? null : +(p.area_sqft / unit.sqft).toFixed(4)}
        onChange={(v) => set("area_sqft", v === null ? null : +(v * unit.sqft).toFixed(2))}
        hint={p.area_sqft && p.area_unit !== "sqft" ? `= ${areaIn(p.area_sqft, "sqft")}` : p.area_sqft ? `≈ ${areaIn(p.area_sqft, "cent")}` : undefined} />
      <Text label="Dimensions" value={p.dimensions} onChange={(v) => set("dimensions", v)} placeholder="e.g. 30 × 40 ft" />
      <Select label="Facing" value={p.facing} options={FACINGS} onChange={(v) => set("facing", v)} allowEmpty />
    </fieldset>
  );
}

/** The facts buyers of each type ask about. */
export function TypeDetailsSection({ p, set }: ListingProps) {
  if (p.category === "residential") return (
    <fieldset id="sec-home-details"><legend>Home details</legend>
      <NumberInput label="Bedrooms (BHK)" value={p.bhk} onChange={(v) => set("bhk", v === null ? null : Math.round(v))} />
      <NumberInput label="Bathrooms" value={p.bathrooms} onChange={(v) => set("bathrooms", v === null ? null : Math.round(v))} />
      <NumberInput label="Carpet area (sq ft)" value={p.carpet_area_sqft} onChange={(v) => set("carpet_area_sqft", v)} />
      <Text label="Floor" value={p.floor_info} onChange={(v) => set("floor_info", v)} placeholder="e.g. 3rd of 6 floors" grow />
      <Text label="Furnishing" value={p.furnishing} onChange={(v) => set("furnishing", v)} list={["Unfurnished", "Semi-furnished", "Furnished"]} />
      <Text label="Parking" value={p.parking} onChange={(v) => set("parking", v)} placeholder="e.g. 1 covered car park" grow />
      <Select label="Possession" value={p.possession} options={["Ready to move", "Under construction"]} onChange={(v) => set("possession", v)} allowEmpty />
    </fieldset>
  );
  if (p.category === "plot" || p.category === "agricultural") return (
    <fieldset id="sec-land-details"><legend>Land details</legend>
      <NumberInput label="Frontage (ft)" value={p.frontage_ft} onChange={(v) => set("frontage_ft", v)} />
      <NumberInput label="Road width (ft)" value={p.road_width_ft} onChange={(v) => set("road_width_ft", v)} />
      <Text label="Land use" value={p.land_use} onChange={(v) => set("land_use", v)} list={["Residential", "Commercial", "Agricultural", "Industrial"]} />
      {p.category === "plot" && <Text label="Floors allowed" value={p.floors_allowed} onChange={(v) => set("floors_allowed", v)} placeholder="e.g. G + 2" />}
      <YesNo label="Corner plot" value={p.corner_plot} onChange={(v) => set("corner_plot", v)} />
      <YesNo label="Boundary wall" value={p.boundary_wall} onChange={(v) => set("boundary_wall", v)} />
      <YesNo label="Gated layout" value={p.gated_layout} onChange={(v) => set("gated_layout", v)} />
    </fieldset>
  );
  return (
    <fieldset id="sec-commercial-details"><legend>Commercial details</legend>
      <NumberInput label="Usable area (sq ft)" value={p.usable_area_sqft} onChange={(v) => set("usable_area_sqft", v)} />
      <Text label="Floor" value={p.floor_info} onChange={(v) => set("floor_info", v)} placeholder="e.g. Ground floor" grow />
      <Text label="Parking" value={p.parking} onChange={(v) => set("parking", v)} placeholder="e.g. 6 car parks, truck access" grow />
      <Text label="Access" value={p.access_notes} onChange={(v) => set("access_notes", v)} placeholder="e.g. Direct access from a 40 ft road" />
      <Text label="Zoning notes" value={p.zoning_notes} onChange={(v) => set("zoning_notes", v)} grow />
      <Select label="Possession" value={p.possession} options={["Ready to move", "Under construction"]} onChange={(v) => set("possession", v)} allowEmpty />
    </fieldset>
  );
}

export function LegalSection({ p, set, descriptionHint }: ListingProps & { descriptionHint?: string }) {
  return (
    <fieldset id="sec-legal-and-details"><legend>Legal &amp; details</legend>
      <Text label="Approval" value={p.approval} onChange={(v) => set("approval", v)} placeholder="Leave empty unless confirmed" list={["DTCP", "CMDA", "Panchayat", "Verification pending"]} hint="Shown exactly as entered. Leave empty rather than guess." />
      <Text label="RERA registration" value={p.rera} onChange={(v) => set("rera", v)} placeholder="RERA number, or “Not applicable”" />
      <Text label="Ownership" value={p.ownership} onChange={(v) => set("ownership", v)} list={["Freehold", "Leasehold", "Power of attorney"]} />
      <Text label="Transaction type" value={p.transaction_type} onChange={(v) => set("transaction_type", v)} list={["New", "Resale"]} />
      <Text label="Availability" value={p.availability} onChange={(v) => set("availability", v)} list={["Immediate", "Within 3 months"]} />
      <TextArea label="Description" value={p.description} onChange={(v) => set("description", v)}
        hint={descriptionHint ?? "Highlights, access, limitations. No return-on-investment claims. Leave a blank line between paragraphs."} />
    </fieldset>
  );
}

export function AmenitiesSection({ p, set }: ListingProps) {
  const [custom, setCustom] = useState("");
  const toggle = (label: string) => set("amenities", p.amenities.includes(label) ? p.amenities.filter((a) => a !== label) : [...p.amenities, label]);
  const customAmenities = p.amenities.filter((a) => !AMENITY_PRESETS.some((x) => x.label === a));
  return (
    <fieldset id="sec-amenities"><legend>Amenities</legend>
      <div className="adm-checks adm-wide">
        {AMENITY_PRESETS.map((a) => <Check key={a.label} label={a.label} checked={p.amenities.includes(a.label)} onChange={() => toggle(a.label)} />)}
        {customAmenities.map((a) => <Check key={a} label={a} checked onChange={() => toggle(a)} />)}
      </div>
      <div className="adm-inline adm-wide">
        <TextInput label="Other amenity" isLabelHidden placeholder="Other amenity" value={custom} onChange={setCustom} />
        <Button type="button" isDisabled={!custom.trim()} onClick={() => { toggle(custom.trim()); setCustom(""); }} variant="secondary" label="Add" />
      </div>
    </fieldset>
  );
}

export function NearbyRows({ p, set }: ListingProps) {
  return (
    <Rows label="Nearby places" rows={p.nearby} onChange={(v) => set("nearby", v)} addLabel="Add place"
      blank={{ group: "Transport", name: "", distance: "" }}
      columns={[{ key: "group", label: "Group", options: NEARBY_GROUPS.map((g) => g.label) }, { key: "name", label: "Place", placeholder: "e.g. Bus stop" }, { key: "distance", label: "Distance", placeholder: "e.g. 1 km" }]} />
  );
}
