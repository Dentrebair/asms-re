"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatINR, formatINRShort } from "@/lib/format";
import { AMENITY_PRESETS, FACINGS, NEARBY_GROUPS, PROPERTY_TYPES, STATUS_LABELS, slugify } from "@/lib/presets";
import { deletePhotos, emptyProperty, explain, mediaUrl, supabase, type PropertyRow } from "./lib";
import { Check, NumberInput, Photos, Rows, Select, Text, TextArea, YesNo } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

export function PropertiesAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<PropertyRow[] | null>(null);
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [query, setQuery] = useState("");

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
  const visible = (rows ?? []).filter((r) => !q || [r.title, r.reference, r.location].some((v) => v?.toLowerCase().includes(q)));

  return (
    <section>
      <div className="adm-toolbar">
        <h2>Properties <small>{rows ? rows.length : "…"}</small></h2>
        <input type="search" placeholder="Search title, reference, location" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search properties" />
        <button type="button" className="adm-btn" onClick={() => setEditing(emptyProperty())}>+ New property</button>
      </div>
      {rows === null ? <p className="adm-muted">Loading…</p> : visible.length === 0 ? (
        <p className="adm-empty">{rows.length === 0 ? "No properties yet. Add your first listing." : "No properties match your search."}</p>
      ) : (
        <ul className="adm-list">
          {visible.map((r) => (
            <li key={r.id}>
              {r.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(r.images[0].path)} alt="" />
              ) : <span className="adm-thumb-empty">No photo</span>}
              <div className="adm-list-main">
                <strong>{r.title}</strong>
                <span>{r.reference} · {r.location || "No location"} · {r.price ? formatINRShort(r.price) : "Price on request"}</span>
                <span className="adm-tags">
                  <em className={r.published ? "adm-tag-live" : "adm-tag-draft"}>{r.published ? "Live" : "Draft"}</em>
                  <em>{r.status_label}</em>
                  {r.featured && <em>Featured</em>}
                </span>
              </div>
              <div className="adm-list-actions">
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => patch(r, { published: !r.published })}>{r.published ? "Unpublish" : "Publish"}</button>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => patch(r, { featured: !r.featured })}>{r.featured ? "Unfeature" : "Feature"}</button>
                <button type="button" className="adm-btn" onClick={() => setEditing(r)}>Edit</button>
                <button type="button" className="adm-btn adm-btn-danger" onClick={() => remove(r)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
    notify(row.published ? "Saved. The website updates in about 3 minutes." : "Saved as draft (not shown on the website).");
    onDone(true);
  }

  const toggleAmenity = (label: string) =>
    set("amenities", p.amenities.includes(label) ? p.amenities.filter((a) => a !== label) : [...p.amenities, label]);
  const customAmenities = p.amenities.filter((a) => !AMENITY_PRESETS.some((x) => x.label === a));

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form-head">
        <button type="button" className="adm-link" onClick={cancel}>← All properties</button>
        <h2>{isNew ? "New property" : `Edit ${initial.reference}`}</h2>
      </div>

      <fieldset><legend>Listing</legend>
        <Text label="Title" value={p.title} onChange={setTitle} required placeholder="e.g. East-facing plot in Tambaram" wide />
        <Text label="Reference" value={p.reference} onChange={setReference} required placeholder="e.g. ASMS-0001" hint="Shown to buyers; must be unique." />
        <Text label="Web address (slug)" value={p.slug} onChange={(v) => { setSlugTouched(true); set("slug", slugify(v ?? "")); }} required hint={`asmsrounaqh.com/properties/${p.slug || "…"}`} />
        <Select label="Property type" value={p.property_type} options={PROPERTY_TYPES} onChange={(v) => set("property_type", v ?? "Residential plot")} required />
        <Select label="Status" value={p.status_label} options={STATUS_LABELS} onChange={(v) => set("status_label", v ?? "Available")} required />
        <Text label="Location" value={p.location} onChange={(v) => set("location", v ?? "")} required placeholder="e.g. Tambaram, Chennai" />
        <Text label="Locality / landmark" value={p.locality} onChange={(v) => set("locality", v)} placeholder="e.g. Near Tambaram railway station" />
        <Field2 label="Posted on"><input type="date" value={p.posted_on ?? ""} onChange={(e) => set("posted_on", e.target.value || null)} /></Field2>
        <div className="adm-checks adm-wide">
          <Check label="Published" hint="Show on the website" checked={p.published} onChange={(v) => set("published", v)} />
          <Check label="Featured" hint="Show on the home page" checked={p.featured} onChange={(v) => set("featured", v)} />
        </div>
      </fieldset>

      <fieldset><legend>Price &amp; size</legend>
        <NumberInput label="Price (₹)" value={p.price} onChange={(v) => set("price", v === null ? null : Math.round(v))} placeholder="Leave empty for “Price on request”"
          hint={p.price ? `${formatINRShort(p.price)} · ${formatINR(p.price)}${p.area_sqft ? ` · ${formatINR(p.price / p.area_sqft)}/sq ft` : ""}` : "Empty = “Price on request”"} />
        <NumberInput label="Area (sq ft)" value={p.area_sqft} onChange={(v) => set("area_sqft", v)} hint={p.area_sqft ? `≈ ${(p.area_sqft / 435.6).toFixed(2)} cents` : undefined} />
        <Text label="Dimensions" value={p.dimensions} onChange={(v) => set("dimensions", v)} placeholder="e.g. 30 × 40 ft" />
        <Select label="Facing" value={p.facing} options={FACINGS} onChange={(v) => set("facing", v)} allowEmpty />
        <Text label="Road width" value={p.road_width} onChange={(v) => set("road_width", v)} placeholder="e.g. 30 ft" />
      </fieldset>

      <fieldset><legend>Legal &amp; details</legend>
        <Text label="Approval" value={p.approval} onChange={(v) => set("approval", v)} placeholder="e.g. DTCP, CMDA" list={["DTCP", "CMDA", "Panchayat", "Verification pending"]} />
        <Text label="RERA registration" value={p.rera} onChange={(v) => set("rera", v)} placeholder="RERA number, or “Not applicable”" />
        <Text label="Ownership" value={p.ownership} onChange={(v) => set("ownership", v)} list={["Freehold", "Leasehold", "Power of attorney"]} />
        <Text label="Transaction type" value={p.transaction_type} onChange={(v) => set("transaction_type", v)} list={["New", "Resale"]} />
        <Text label="Availability" value={p.availability} onChange={(v) => set("availability", v)} list={["Immediate", "Within 3 months", "Under construction"]} />
        <Text label="Floors allowed" value={p.floors_allowed} onChange={(v) => set("floors_allowed", v)} placeholder="e.g. G + 2" />
        <YesNo label="Corner plot" value={p.corner_plot} onChange={(v) => set("corner_plot", v)} />
        <YesNo label="Boundary wall" value={p.boundary_wall} onChange={(v) => set("boundary_wall", v)} />
        <YesNo label="Gated layout" value={p.gated_layout} onChange={(v) => set("gated_layout", v)} />
        <TextArea label="Description" value={p.description} onChange={(v) => set("description", v)} hint="Leave a blank line between paragraphs." />
      </fieldset>

      <fieldset><legend>Photos</legend>
        <Photos images={p.images} onChange={(images) => set("images", images)} folder="properties" onUploaded={(path) => uploaded.current.push(path)} />
      </fieldset>

      <fieldset><legend>Amenities</legend>
        <div className="adm-checks adm-wide">
          {AMENITY_PRESETS.map((a) => <Check key={a.label} label={a.label} checked={p.amenities.includes(a.label)} onChange={() => toggleAmenity(a.label)} />)}
          {customAmenities.map((a) => <Check key={a} label={a} checked onChange={() => toggleAmenity(a)} />)}
        </div>
        <div className="adm-inline adm-wide">
          <input placeholder="Other amenity" aria-label="Other amenity" value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} />
          <button type="button" className="adm-btn adm-btn-ghost" disabled={!customAmenity.trim()} onClick={() => { toggleAmenity(customAmenity.trim()); setCustomAmenity(""); }}>Add</button>
        </div>
      </fieldset>

      <fieldset><legend>Nearby &amp; documents</legend>
        <Rows label="Nearby places" rows={p.nearby} onChange={(v) => set("nearby", v)} addLabel="Add place"
          blank={{ group: "Transport", name: "", distance: "" }}
          columns={[{ key: "group", label: "Group", options: NEARBY_GROUPS.map((g) => g.label) }, { key: "name", label: "Place", placeholder: "e.g. Bus stop" }, { key: "distance", label: "Distance", placeholder: "e.g. 1 km" }]} />
        <Rows label="Documents & approvals" rows={p.documents} onChange={(v) => set("documents", v)} addLabel="Add document"
          blank={{ label: "", status: "Available" }}
          columns={[{ key: "label", label: "Document", placeholder: "e.g. Patta & chitta" }, { key: "status", label: "Status", placeholder: "e.g. Available on request" }]} />
      </fieldset>

      <div className="adm-form-foot">
        <button type="button" className="adm-btn adm-btn-ghost" onClick={cancel}>Cancel</button>
        <button type="submit" className="adm-btn" disabled={saving}>{saving ? "Saving…" : isNew ? "Create property" : "Save changes"}</button>
      </div>
    </form>
  );
}

function Field2({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="adm-field"><span className="adm-label">{label}</span>{children}</label>;
}
