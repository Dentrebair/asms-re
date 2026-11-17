"use client";

import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowLeft, Building2, ExternalLink, Filter, Plus, Search } from "lucide-react";
import { Divider } from "@astryxdesign/core/Divider";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Selector } from "@astryxdesign/core/Selector";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text as TextLine } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatINR, formatINRShort } from "@/lib/format";
import { AMENITY_PRESETS, FACINGS, NEARBY_GROUPS, slugify } from "@/lib/presets";
import { AREA_UNITS, CATEGORIES, SUBTYPES, areaIn } from "@/lib/property";
import { deletePhotos, emptyProperty, explain, mediaUrl, supabase, type PropertyRow, type PropertyStage } from "./lib";
import { Check, DateField, NumberInput, Photos, Rows, SectionHeader, Select, StatCards, Text, TextArea, Thumb, YesNo } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Stages staff set directly. Seller-review stages (submitted … approved) arrive with the seller portal.
const STAGES: { value: PropertyStage; label: string }[] = [
  { value: "draft", label: "Draft (not on the website)" },
  { value: "live", label: "Live (in search)" },
  { value: "paused", label: "Paused (hidden, stats kept)" },
  { value: "sold", label: "Sold (page kept, marked Sold)" },
  { value: "archived", label: "Archived (hidden)" },
];
const STAGE_LABEL: Record<PropertyStage, string> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under review", changes_requested: "Changes requested", rejected: "Rejected",
  approved: "Approved", live: "Live", paused: "Paused", sold: "Sold", expired: "Needs reconfirming", archived: "Archived",
};
const isPublic = (stage: PropertyStage) => stage === "live" || stage === "sold";
const STALE_DAYS = 30;
const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 864e5) : Infinity);
const todayIso = () => new Date().toISOString().slice(0, 10);

export function PropertiesAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [view, setView] = useState<"all" | "live" | "hidden" | "sold" | "stale" | "featured">("all");

  async function load() {
    const { data, error } = await supabase().from("properties").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) notify(explain(error), "error");
    else setRows(data as PropertyRow[]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, []);

  async function patch(row: PropertyRow, change: Partial<PropertyRow>) {
    const { error } = await supabase().from("properties").update(change).eq("id", row.id!);
    if (error) return notify(explain(error), "error");
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, ...change } : r)) ?? null);
    notify("Saved. The website updates in about 3 minutes.");
  }

  async function remove(row: PropertyRow) {
    if (!confirm(`Delete “${row.title}” (${row.reference})? This can’t be undone.`)) return;
    const { error } = await supabase().from("properties").delete().eq("id", row.id!);
    if (error) return notify(explain(error), "error");
    await deletePhotos(row.images.map((i) => i.path));
    setRows((rs) => rs?.filter((r) => r.id !== row.id) ?? null);
    notify("Property deleted.");
  }

  if (editing) {
    return <PropertyForm initial={editing} notify={notify} onDone={(saved) => { setEditing(null); if (saved) void load(); }} />;
  }

  const q = query.trim().toLowerCase();
  const all = rows ?? [];
  const stale = (r: PropertyRow) => r.stage === "live" && daysSince(r.last_confirmed_on) > STALE_DAYS;
  const matchesView = (r: PropertyRow) =>
    view === "all" ? true : view === "stale" ? stale(r) : view === "featured" ? r.featured : view === "hidden" ? ["draft", "paused", "archived"].includes(r.stage) : r.stage === view;
  const visible = all.filter((r) => matchesView(r) && (type === "all" || r.category === type)
    && (!q || [r.title, r.reference, r.location, r.locality].some((v) => v?.toLowerCase().includes(q))));
  const stat = (label: string, value: typeof view, n: number, tone?: "warning" | "success") =>
    ({ label, value: rows ? n : "…", tone, isActive: view === value, onClick: () => setView(view === value ? "all" : value) });

  const columns: TableColumn<Row>[] = [
    { key: "photo", header: "", width: pixel(76), renderCell: (r) => <Thumb src={r.images[0] ? mediaUrl(r.images[0].path) : null} /> },
    { key: "title", header: "Property", width: proportional(3, { minWidth: 200 }), renderCell: (r) => (
      <VStack gap={0}>
        <TextLine weight="semibold" maxLines={2}>{r.title}</TextLine>
        <TextLine type="supporting" maxLines={1}>{r.reference} · {r.location || "No location"}</TextLine>
      </VStack>
    ) },
    { key: "property_type", header: "Type", width: proportional(1.2, { minWidth: 90 }), renderCell: (r) => <TextLine type="supporting">{r.property_type}</TextLine> },
    { key: "price", header: "Price", width: proportional(1, { minWidth: 80 }), renderCell: (r) => <TextLine hasTabularNumbers>{r.price ? formatINRShort(r.price) : "On request"}</TextLine> },
    { key: "stage", header: "Status", width: proportional(1.3, { minWidth: 120 }), renderCell: (r) => (
      <HStack gap={1} wrap="wrap">
        <Badge label={STAGE_LABEL[r.stage]} variant={r.stage === "live" ? "success" : r.stage === "sold" ? "neutral" : "warning"} />
        {r.featured && <Badge label="Featured" variant="info" />}
        {stale(r) && <Badge label={`Not confirmed ${STALE_DAYS}+ days`} variant="warning" />}
      </HStack>
    ) },
    { key: "actions", header: "", width: pixel(200), align: "end", renderCell: (r) => (
      <HStack gap={1} hAlign="end">
        {r.stage === "live"
          ? <Button size="sm" onClick={() => patch(r, { stage: "paused" })} label="Pause" />
          : r.stage !== "sold" && <Button size="sm" onClick={() => patch(r, { stage: "live", last_confirmed_on: todayIso() })} label="Publish" />}
        <Button size="sm" variant="primary" onClick={() => setEditing(r)} label="Edit" />
        <MoreMenu label={`More actions for ${r.reference}`} size="sm" alignment="end" items={[
          ...(r.stage === "live" ? [
            { label: "Still available", description: "Record that the details were checked today", onClick: () => void patch(r, { last_confirmed_on: todayIso() }) },
            { label: "Mark sold", onClick: () => { if (confirm(`Mark ${r.reference} as sold? It leaves search and stops taking enquiries.`)) void patch(r, { stage: "sold" }); } },
          ] : []),
          { label: r.featured ? "Unfeature" : "Feature on home page", onClick: () => void patch(r, { featured: !r.featured }) },
          ...(isPublic(r.stage) ? [{ label: "View on website", href: `/properties/${r.slug}`, target: "_blank" as const }] : []),
          { label: "Delete", variant: "destructive" as const, onClick: () => void remove(r) },
        ]} />
      </HStack>
    ) },
  ];

  return (
    <section>
      <SectionHeader title="Properties" count={rows ? rows.length : null} description="Listings on the website. Live ones appear in search; drafts and paused ones are hidden.">
        <Button onClick={() => setEditing(emptyProperty())} variant="primary" icon={<Plus size={16} />} label="New property" />
      </SectionHeader>
      <StatCards items={[
        stat("All properties", "all", all.length),
        stat("Live", "live", all.filter((r) => r.stage === "live").length, "success"),
        stat("Drafts and paused", "hidden", all.filter((r) => ["draft", "paused", "archived"].includes(r.stage)).length),
        stat("Needs reconfirming", "stale", all.filter(stale).length, "warning"),
        stat("Featured", "featured", all.filter((r) => r.featured).length),
      ]} />
      <div className="adm-filters">
        <TextInput type="search" label="Search properties" isLabelHidden placeholder="Search title, reference, location" value={query} onChange={setQuery} hasClear startIcon={Search} />
        <Selector label="Type" isLabelHidden startIcon={Building2} value={type} onChange={setType}
          options={[{ value: "all", label: "All types" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]} />
        <Selector label="Status" isLabelHidden startIcon={Filter} value={view} onChange={(v) => setView(v as typeof view)}
          options={[{ value: "all", label: "Any status" }, { value: "live", label: "Live" }, { value: "hidden", label: "Drafts and paused" }, { value: "sold", label: "Sold" }, { value: "stale", label: "Needs reconfirming" }, { value: "featured", label: "Featured" }]} />
      </div>
      {rows === null ? <p className="adm-muted">Loading…</p> : visible.length === 0 ? (
        <div className="adm-empty"><EmptyState isCompact title={rows.length === 0 ? "No properties yet" : "No properties match"} description={rows.length === 0 ? "Add your first listing." : "Try another search or filter."} /></div>
      ) : (
        <Card padding={0} className="adm-table">
          <Table<Row> data={visible as Row[]} columns={columns} idKey="id" hasHover density="balanced" />
        </Card>
      )}
    </section>
  );
}

type Row = PropertyRow & Record<string, unknown>;

const JUMP: [string, string][] = [
  ["sec-listing", "Listing"], ["sec-location", "Location"], ["sec-price-and-size", "Price & size"], ["sec-legal-and-details", "Legal & details"],
  ["sec-photos", "Photos"], ["sec-amenities", "Amenities"], ["sec-nearby-and-documents", "Nearby & documents"],
];

function PropertyForm({ initial, notify, onDone }: { initial: PropertyRow; notify: Notify; onDone: (saved: boolean) => void }) {
  const [p, setP] = useState<PropertyRow>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [saving, setSaving] = useState(false);
  const [customAmenity, setCustomAmenity] = useState("");
  const uploaded = useRef<string[]>([]);
  const isNew = !initial.id;

  const set = <K extends keyof PropertyRow>(key: K, value: PropertyRow[K]) => setP((cur) => ({ ...cur, [key]: value }));
  const setTitle = (title: string | null) =>
    setP((cur) => ({ ...cur, title: title ?? "", slug: slugTouched ? cur.slug : slugify(`${title ?? ""} ${cur.reference}`) }));
  const setReference = (reference: string | null) =>
    setP((cur) => ({ ...cur, reference: reference ?? "", slug: slugTouched ? cur.slug : slugify(`${cur.title} ${reference ?? ""}`) }));

  async function cancel() {
    await deletePhotos(uploaded.current.filter((path) => !initial.images.some((i) => i.path === path)));
    onDone(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id, updated_at: _updated, ...fields } = p;
    void _updated;
    const row = {
      ...fields,
      slug: p.slug || slugify(`${p.title} ${p.reference}`),
      nearby: p.nearby.filter((n) => n.name.trim()),
      documents: p.documents.filter((d) => d.label.trim()),
    };
    const { error } = id ? await supabase().from("properties").update(row).eq("id", id) : await supabase().from("properties").insert(row);
    setSaving(false);
    if (error) return notify(explain(error), "error");
    // Photos removed in this edit are now unreferenced.
    await deletePhotos(initial.images.map((i) => i.path).filter((path) => !p.images.some((i) => i.path === path)));
    notify(isPublic(row.stage) ? "Saved. The website updates in about 3 minutes." : "Saved. It is not shown on the website.");
    onDone(true);
  }

  const toggleAmenity = (label: string) =>
    set("amenities", p.amenities.includes(label) ? p.amenities.filter((a) => a !== label) : [...p.amenities, label]);
  const customAmenities = p.amenities.filter((a) => !AMENITY_PRESETS.some((x) => x.label === a));

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form-head">
        <Button type="button" onClick={cancel} variant="ghost" icon={<ArrowLeft size={16} />} label="All properties" />
        <SectionHeader title={isNew ? "New property" : `Edit ${initial.reference}`} description={isNew ? "Fill in the listing, then publish it from the panel on the right." : p.title} />
      </div>
      <div className="adm-edit-grid">
      <div className="adm-edit-main">

      <fieldset id="sec-listing"><legend>Listing</legend>
        <Text label="Title" value={p.title} onChange={setTitle} required placeholder="e.g. East-facing plot in Tambaram" wide />
        <Text label="Reference" value={p.reference} onChange={setReference} required placeholder="e.g. ASMS-0001" hint="Shown to buyers; must be unique." />
        <Text label="Web address (slug)" value={p.slug} onChange={(v) => { setSlugTouched(true); set("slug", slugify(v ?? "")); }} required grow hint={`asmsrounaqh.com/properties/${p.slug || "…"}`} />
        <Select label="Category" value={p.category} options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} required
          onChange={(v) => { const c = (v ?? "plot") as PropertyRow["category"]; setP((cur) => ({ ...cur, category: c, property_type: SUBTYPES[c].includes(cur.property_type) ? cur.property_type : SUBTYPES[c][0] })); }} />
        <Select label="Property type" value={p.property_type} options={SUBTYPES[p.category]} onChange={(v) => set("property_type", v ?? SUBTYPES[p.category][0])} required />
      </fieldset>

      <fieldset id="sec-location"><legend>Location</legend>
        <Text label="Location" value={p.location} onChange={(v) => set("location", v ?? "")} required grow placeholder="e.g. Tambaram, Chennai" />
        <Text label="Locality / landmark" value={p.locality} onChange={(v) => set("locality", v)} placeholder="e.g. Near Tambaram railway station" />
        <Text label="Google Maps link" value={p.map_url} onChange={(v) => set("map_url", v)} hint="Paste the share link from Google Maps (starts with https://)" placeholder="https://maps.app.goo.gl/…" />
      </fieldset>

      <fieldset id="sec-price-and-size"><legend>Price &amp; size</legend>
        <NumberInput label="Price (₹)" value={p.price} onChange={(v) => set("price", v === null ? null : Math.round(v))} placeholder="Leave empty for “Price on request”"
          hint={p.price ? `${formatINRShort(p.price)} · ${formatINR(p.price)}${p.area_sqft ? ` · ${formatINR(p.price / p.area_sqft)}/sq ft` : ""}` : "Empty = “Price on request”"} />
        <YesNo label="Price negotiable" value={p.price_negotiable} onChange={(v) => set("price_negotiable", v)} />
        <Select label="Show area in" value={p.area_unit} options={AREA_UNITS.map((u) => ({ value: u.id, label: u.label }))} onChange={(v) => set("area_unit", (v ?? "sqft") as PropertyRow["area_unit"])} required />
        <NumberInput label={`${p.category === "residential" ? "Built-up area" : "Area"} (${(AREA_UNITS.find((u) => u.id === p.area_unit) ?? AREA_UNITS[0]).label})`}
          value={p.area_sqft === null ? null : +(p.area_sqft / (AREA_UNITS.find((u) => u.id === p.area_unit) ?? AREA_UNITS[0]).sqft).toFixed(4)}
          onChange={(v) => set("area_sqft", v === null ? null : +(v * (AREA_UNITS.find((u) => u.id === p.area_unit) ?? AREA_UNITS[0]).sqft).toFixed(2))}
          hint={p.area_sqft && p.area_unit !== "sqft" ? `= ${areaIn(p.area_sqft, "sqft")}` : p.area_sqft ? `≈ ${areaIn(p.area_sqft, "cent")}` : undefined} />
        <Text label="Dimensions" value={p.dimensions} onChange={(v) => set("dimensions", v)} placeholder="e.g. 30 × 40 ft" />
        <Select label="Facing" value={p.facing} options={FACINGS} onChange={(v) => set("facing", v)} allowEmpty />
      </fieldset>

      {p.category === "residential" && (
        <fieldset id="sec-home-details"><legend>Home details</legend>
          <NumberInput label="Bedrooms (BHK)" value={p.bhk} onChange={(v) => set("bhk", v === null ? null : Math.round(v))} />
          <NumberInput label="Bathrooms" value={p.bathrooms} onChange={(v) => set("bathrooms", v === null ? null : Math.round(v))} />
          <NumberInput label="Carpet area (sq ft)" value={p.carpet_area_sqft} onChange={(v) => set("carpet_area_sqft", v)} />
          <Text label="Floor" value={p.floor_info} onChange={(v) => set("floor_info", v)} placeholder="e.g. 3rd of 6 floors" grow />
          <Text label="Furnishing" value={p.furnishing} onChange={(v) => set("furnishing", v)} list={["Unfurnished", "Semi-furnished", "Furnished"]} />
          <Text label="Parking" value={p.parking} onChange={(v) => set("parking", v)} placeholder="e.g. 1 covered car park" grow />
          <Select label="Possession" value={p.possession} options={["Ready to move", "Under construction"]} onChange={(v) => set("possession", v)} allowEmpty />
        </fieldset>
      )}

      {(p.category === "plot" || p.category === "agricultural") && (
        <fieldset id="sec-land-details"><legend>Land details</legend>
          <NumberInput label="Frontage (ft)" value={p.frontage_ft} onChange={(v) => set("frontage_ft", v)} />
          <NumberInput label="Road width (ft)" value={p.road_width_ft} onChange={(v) => set("road_width_ft", v)} />
          <Text label="Land use" value={p.land_use} onChange={(v) => set("land_use", v)} list={["Residential", "Commercial", "Agricultural", "Industrial"]} />
          {p.category === "plot" && <Text label="Floors allowed" value={p.floors_allowed} onChange={(v) => set("floors_allowed", v)} placeholder="e.g. G + 2" />}
          <YesNo label="Corner plot" value={p.corner_plot} onChange={(v) => set("corner_plot", v)} />
          <YesNo label="Boundary wall" value={p.boundary_wall} onChange={(v) => set("boundary_wall", v)} />
          <YesNo label="Gated layout" value={p.gated_layout} onChange={(v) => set("gated_layout", v)} />
        </fieldset>
      )}

      {p.category === "commercial" && (
        <fieldset id="sec-commercial-details"><legend>Commercial details</legend>
          <NumberInput label="Usable area (sq ft)" value={p.usable_area_sqft} onChange={(v) => set("usable_area_sqft", v)} />
          <Text label="Floor" value={p.floor_info} onChange={(v) => set("floor_info", v)} placeholder="e.g. Ground floor" grow />
          <Text label="Parking" value={p.parking} onChange={(v) => set("parking", v)} placeholder="e.g. 6 car parks, truck access" grow />
          <Text label="Access" value={p.access_notes} onChange={(v) => set("access_notes", v)} placeholder="e.g. Direct access from a 40 ft road" />
          <Text label="Zoning notes" value={p.zoning_notes} onChange={(v) => set("zoning_notes", v)} grow />
          <Select label="Possession" value={p.possession} options={["Ready to move", "Under construction"]} onChange={(v) => set("possession", v)} allowEmpty />
        </fieldset>
      )}

      <fieldset id="sec-legal-and-details"><legend>Legal &amp; details</legend>
        <Text label="Approval" value={p.approval} onChange={(v) => set("approval", v)} placeholder="Leave empty unless confirmed" list={["DTCP", "CMDA", "Panchayat", "Verification pending"]} hint="Shown exactly as entered. Leave empty rather than guess." />
        <Text label="RERA registration" value={p.rera} onChange={(v) => set("rera", v)} placeholder="RERA number, or “Not applicable”" />
        <Text label="Ownership" value={p.ownership} onChange={(v) => set("ownership", v)} list={["Freehold", "Leasehold", "Power of attorney"]} />
        <Text label="Transaction type" value={p.transaction_type} onChange={(v) => set("transaction_type", v)} list={["New", "Resale"]} />
        <Text label="Availability" value={p.availability} onChange={(v) => set("availability", v)} list={["Immediate", "Within 3 months"]} />
        <TextArea label="Description" value={p.description} onChange={(v) => set("description", v)} hint="Highlights, access, limitations. No return-on-investment claims. Leave a blank line between paragraphs." />
      </fieldset>

      <fieldset id="sec-photos"><legend>Photos</legend>
        <Photos images={p.images} onChange={(images) => set("images", images)} folder="properties" onUploaded={(path) => uploaded.current.push(path)} />
      </fieldset>

      <fieldset id="sec-amenities"><legend>Amenities</legend>
        <div className="adm-checks adm-wide">
          {AMENITY_PRESETS.map((a) => <Check key={a.label} label={a.label} checked={p.amenities.includes(a.label)} onChange={() => toggleAmenity(a.label)} />)}
          {customAmenities.map((a) => <Check key={a} label={a} checked onChange={() => toggleAmenity(a)} />)}
        </div>
        <div className="adm-inline adm-wide">
          <TextInput label="Other amenity" isLabelHidden placeholder="Other amenity" value={customAmenity} onChange={setCustomAmenity} />
          <Button type="button" isDisabled={!customAmenity.trim()} onClick={() => { toggleAmenity(customAmenity.trim()); setCustomAmenity(""); }} variant="secondary" label="Add" />
        </div>
      </fieldset>

      <fieldset id="sec-nearby-and-documents"><legend>Nearby &amp; documents</legend>
        <Rows label="Nearby places" rows={p.nearby} onChange={(v) => set("nearby", v)} addLabel="Add place"
          blank={{ group: "Transport", name: "", distance: "" }}
          columns={[{ key: "group", label: "Group", options: NEARBY_GROUPS.map((g) => g.label) }, { key: "name", label: "Place", placeholder: "e.g. Bus stop" }, { key: "distance", label: "Distance", placeholder: "e.g. 1 km" }]} />
        <Rows label="Documents & approvals" rows={p.documents} onChange={(v) => set("documents", v)} addLabel="Add document"
          blank={{ label: "", status: "Available" }}
          columns={[{ key: "label", label: "Document", placeholder: "e.g. Patta & chitta" }, { key: "status", label: "Status", placeholder: "e.g. Available on request" }]} />
      </fieldset>

      </div>

      <aside className="adm-edit-side" aria-label="Publishing">
        <Card padding={5}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center"><Heading level={2}>Publishing</Heading><Badge label={STAGE_LABEL[p.stage]} variant={p.stage === "live" ? "success" : "warning"} /></HStack>
            <Select label="Stage" value={p.stage} options={p.stage in STAGE_LABEL && !STAGES.some((x) => x.value === p.stage) ? [...STAGES, { value: p.stage, label: STAGE_LABEL[p.stage] }] : STAGES} onChange={(v) => set("stage", (v ?? "draft") as PropertyStage)} required />
            <Check label="Featured" hint="Show on the home page" checked={p.featured} onChange={(v) => set("featured", v)} />
            <DateField label="Posted on" value={p.posted_on} onChange={(v) => set("posted_on", v)} />
            <DateField label="Details last confirmed" value={p.last_confirmed_on} onChange={(v) => set("last_confirmed_on", v)} />
            {!isNew && isPublic(initial.stage) && <Button href={`/properties/${initial.slug}`} target="_blank" variant="ghost" icon={<ExternalLink size={16} />} label="View on website" />}
            <Divider />
            <VStack gap={2}>
              <Button type="submit" isDisabled={saving} variant="primary" width="100%" label={saving ? "Saving…" : isNew ? "Create property" : "Save changes"} />
              <Button type="button" onClick={cancel} variant="secondary" width="100%" label="Cancel" />
            </VStack>
          </VStack>
        </Card>
        <nav className="adm-jump" aria-label="Form sections">
          {JUMP.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
      </aside>
      </div>
    </form>
  );
}
