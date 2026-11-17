"use client";

import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading, Text as TextLine } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { FolderTree, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CATEGORY_ICONS, slugify } from "@/lib/presets";
import { deletePhotos, emptyProduct, explain, mediaUrl, supabase, type CategoryRow, type ProductRow } from "./lib";
import { Check, NumberInput, Photos, Rows, SectionHeader, Select, StatCards, Text, TextArea, Thumb } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

export function ProductsAdmin({ notify }: { notify: Notify }) {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "live" | "draft">("all");

  async function load() {
    const [p, c] = await Promise.all([
      supabase().from("products").select("*").order("sort_order").order("name"),
      supabase().from("product_categories").select("*").order("sort_order").order("name"),
    ]);
    if (p.error || c.error) return notify(explain(p.error ?? c.error), "error");
    setProducts(p.data as ProductRow[]);
    setCategories(c.data as CategoryRow[]);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, []);

  async function togglePublished(row: ProductRow) {
    const { error } = await supabase().from("products").update({ published: !row.published }).eq("id", row.id!);
    if (error) return notify(explain(error), "error");
    setProducts((ps) => ps?.map((p) => (p.id === row.id ? { ...p, published: !row.published } : p)) ?? null);
    notify("Saved. The website updates in about 3 minutes.");
  }

  async function remove(row: ProductRow) {
    if (!confirm(`Delete “${row.name}”? This can’t be undone.`)) return;
    const { error } = await supabase().from("products").delete().eq("id", row.id!);
    if (error) return notify(explain(error), "error");
    if (row.image_path) await deletePhotos([row.image_path]);
    setProducts((ps) => ps?.filter((p) => p.id !== row.id) ?? null);
    notify("Product deleted.");
  }

  if (editing) return <ProductForm initial={editing} categories={categories} notify={notify} onDone={(saved) => { setEditing(null); if (saved) void load(); }} />;
  if (managingCategories) return <CategoriesForm categories={categories} notify={notify} onDone={() => { setManagingCategories(false); void load(); }} />;

  const all = products ?? [];
  const q = query.trim().toLowerCase();
  const shown = (p: ProductRow) => (status === "all" || (status === "live") === p.published) && (!q || [p.name, p.summary, p.unit].some((v) => v?.toLowerCase().includes(q)));
  const stat = (label: string, value: typeof status, n: number, tone?: "success" | "warning") =>
    ({ label, value: products ? n : "…", tone, isActive: status === value, onClick: () => setStatus(status === value ? "all" : value) });
  const columns: TableColumn<Row>[] = [
    { key: "photo", header: "", width: pixel(76), renderCell: (p) => <Thumb src={p.image_path ? mediaUrl(p.image_path) : null} /> },
    { key: "name", header: "Product", width: proportional(3, { minWidth: 200 }), renderCell: (p) => (
      <VStack gap={0}><TextLine weight="semibold">{p.name}</TextLine><TextLine type="supporting" maxLines={1}>{p.summary || "No summary"}</TextLine></VStack>
    ) },
    { key: "unit", header: "Priced", width: proportional(1, { minWidth: 90 }), renderCell: (p) => <TextLine type="supporting">{p.unit || "—"}</TextLine> },
    { key: "published", header: "Status", width: proportional(1, { minWidth: 90 }), renderCell: (p) => <Badge label={p.published ? "Live" : "Draft"} variant={p.published ? "success" : "warning"} /> },
    { key: "actions", header: "", width: pixel(250), align: "end", renderCell: (p) => (
      <HStack gap={1} hAlign="end">
        <Button size="sm" onClick={() => togglePublished(p)} label={p.published ? "Unpublish" : "Publish"} />
        <Button size="sm" variant="primary" onClick={() => setEditing(p)} label="Edit" />
        <MoreMenu label={`More actions for ${p.name}`} size="sm" alignment="end" items={[
          ...(p.published ? [{ label: "View on website", href: `/products/${p.slug}`, target: "_blank" as const }] : []),
          { label: "Delete", variant: "destructive" as const, onClick: () => void remove(p) },
        ]} />
      </HStack>
    ) },
  ];

  return (
    <section>
      <SectionHeader title="Construction products" count={products ? products.length : null} description="The catalogue on the website, grouped by category. Prices are quoted per enquiry.">
        <Button onClick={() => setManagingCategories(true)} variant="secondary" icon={<FolderTree size={16} />} label="Categories" />
        <Button isDisabled={categories.length === 0} onClick={() => setEditing(emptyProduct(categories[0]?.id))} variant="primary" icon={<Plus size={16} />} label="New product" />
      </SectionHeader>
      <StatCards items={[
        stat("All products", "all", all.length),
        stat("Live", "live", all.filter((p) => p.published).length, "success"),
        stat("Drafts", "draft", all.filter((p) => !p.published).length, "warning"),
        { label: "Categories", value: categories.length },
      ]} />
      <div className="adm-filters">
        <TextInput type="search" label="Search products" isLabelHidden placeholder="Search name, summary, unit" value={query} onChange={setQuery} hasClear startIcon={Search} />
      </div>
      {products === null ? <p className="adm-muted">Loading…</p> : categories.map((c) => {
        const items = products.filter((p) => p.category_id === c.id);
        const rowsShown = items.filter(shown);
        return (
          <div key={c.id} className="adm-group">
            <HStack gap={2} vAlign="center"><Heading level={2}>{c.name}</Heading><Badge label={String(items.length)} variant="neutral" /></HStack>
            {items.length === 0 ? <p className="adm-empty">No products in this category.</p>
              : rowsShown.length === 0 ? <p className="adm-empty">No products here match the search.</p> : (
              <Card padding={0} className="adm-table">
                <Table<Row> data={rowsShown as Row[]} columns={columns} idKey="id" hasHover />
              </Card>
            )}
          </div>
        );
      })}
    </section>
  );
}

type Row = ProductRow & Record<string, unknown>;

function ProductForm({ initial, categories, notify, onDone }: { initial: ProductRow; categories: CategoryRow[]; notify: Notify; onDone: (saved: boolean) => void }) {
  const [p, setP] = useState<ProductRow>(initial);
  const [saving, setSaving] = useState(false);
  const uploaded = useRef<string[]>([]);
  const isNew = !initial.id;
  const set = <K extends keyof ProductRow>(key: K, value: ProductRow[K]) => setP((cur) => ({ ...cur, [key]: value }));

  async function cancel() {
    await deletePhotos(uploaded.current.filter((path) => path !== initial.image_path));
    onDone(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id, updated_at: _updated, ...fields } = p;
    void _updated;
    const row = { ...fields, slug: p.slug || slugify(p.name), specs: p.specs.filter((s) => s.label.trim() && s.value.trim()) };
    const { error } = id ? await supabase().from("products").update(row).eq("id", id) : await supabase().from("products").insert(row);
    setSaving(false);
    if (error) return notify(explain(error), "error");
    if (initial.image_path && initial.image_path !== p.image_path) await deletePhotos([initial.image_path]);
    notify(row.published ? "Saved. The website updates in about 3 minutes." : "Saved as draft (not shown on the website).");
    onDone(true);
  }

  const images = p.image_path ? [{ path: p.image_path, alt: p.image_alt ?? "" }] : [];

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form-head">
        <Button type="button" onClick={cancel} variant="ghost" label="← All products" />
        <h2>{isNew ? "New product" : `Edit ${initial.name}`}</h2>
      </div>
      <fieldset><legend>Product</legend>
        <Text label="Name" value={p.name} onChange={(v) => setP((cur) => ({ ...cur, name: v ?? "", slug: isNew ? slugify(v ?? "") : cur.slug }))} required wide />
        <Select label="Category" value={p.category_id} options={categories.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set("category_id", v ?? "")} required />
        <Text label="Pricing unit" value={p.unit} onChange={(v) => set("unit", v ?? "")} placeholder="e.g. Per tonne" list={["Per tonne", "Per bag", "Per sq ft", "Per running metre", "Per cubic metre", "Per unit", "Per project"]} />
        <NumberInput label="Sort order" value={p.sort_order} onChange={(v) => set("sort_order", Math.round(v ?? 0))} hint="Lower numbers appear first." />
        <TextArea label="Summary" value={p.summary} onChange={(v) => set("summary", v ?? "")} rows={2} />
        <TextArea label="Suitable for" value={p.suitable_use} onChange={(v) => set("suitable_use", v)} rows={2} hint="Where it is typically used. No warranties unless confirmed by the manufacturer." />
        <Text label="Availability" value={p.availability} onChange={(v) => set("availability", v)} list={["Usually in stock", "Made to order", "Lead time 1 to 2 weeks"]} hint="Indicative only." />
        <div className="adm-checks adm-wide"><Check label="Published" hint="Show on the website" checked={p.published} onChange={(v) => set("published", v)} /></div>
      </fieldset>
      <fieldset><legend>Photo</legend>
        <Photos images={images} max={1} folder="products" onUploaded={(path) => uploaded.current.push(path)}
          onChange={(imgs) => setP((cur) => ({ ...cur, image_path: imgs[0]?.path ?? null, image_alt: imgs[0]?.alt || null }))} />
      </fieldset>
      <fieldset><legend>Specifications</legend>
        <Rows label="Specs shown on the product card" rows={p.specs} onChange={(v) => set("specs", v)} addLabel="Add specification"
          blank={{ label: "", value: "" }} columns={[{ key: "label", label: "Label", placeholder: "e.g. Grade" }, { key: "value", label: "Value", placeholder: "e.g. Fe 500D" }]} />
      </fieldset>
      <div className="adm-form-foot">
        <Button type="button" onClick={cancel} variant="secondary" label="Cancel" />
        <Button type="submit" isDisabled={saving} variant="primary" label={saving ? "Saving…" : isNew ? "Create product" : "Save changes"} />
      </div>
    </form>
  );
}

function CategoriesForm({ categories, notify, onDone }: { categories: CategoryRow[]; notify: Notify; onDone: () => void }) {
  const [rows, setRows] = useState(categories);
  const [saving, setSaving] = useState(false);
  const original = new Set(categories.map((c) => c.id));

  const update = (i: number, change: Partial<CategoryRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...change } : r)));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const keep = rows.filter((r) => r.name.trim()).map((r, i) => ({ ...r, id: r.id || slugify(r.name), sort_order: i + 1 }));
    if (new Set(keep.map((k) => k.id)).size !== keep.length) {
      setSaving(false);
      return notify("Two categories have the same name. Rename one of them.", "error");
    }
    const removed = categories.filter((c) => !keep.some((k) => k.id === c.id)).map((c) => c.id);
    if (removed.length) {
      const del = await supabase().from("product_categories").delete().in("id", removed);
      if (del.error) { setSaving(false); return notify(explain(del.error), "error"); }
    }
    const { error } = await supabase().from("product_categories").upsert(keep);
    setSaving(false);
    if (error) return notify(explain(error), "error");
    notify("Categories saved.");
    onDone();
  }

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form-head">
        <Button type="button" onClick={onDone} variant="ghost" label="← All products" />
        <h2>Product categories</h2>
      </div>
      {rows.map((c, i) => (
        <fieldset key={c.id || `new-${i}`}>
          <legend>{c.name || "New category"}</legend>
          <Text label="Name" value={c.name} onChange={(v) => update(i, { name: v ?? "" })} required />
          <Select label="Icon" value={c.icon} options={CATEGORY_ICONS} onChange={(v) => update(i, { icon: v ?? "layers" })} />
          <TextArea label="Intro" value={c.intro} onChange={(v) => update(i, { intro: v ?? "" })} rows={2} />
          <div className="adm-inline adm-wide">
            <Button type="button" isDisabled={i === 0} onClick={() => setRows((rs) => { const n = [...rs]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} variant="secondary" label="Move up" />
            <Button type="button" variant="destructive" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} label={original.has(c.id) ? "Delete category" : "Remove"} />
          </div>
        </fieldset>
      ))}
      <Button type="button" onClick={() => setRows((rs) => [...rs, { id: "", name: "", intro: "", icon: "layers", sort_order: rs.length + 1 }])} variant="secondary" label="+ Add category" />
      <p className="adm-muted">A category can only be deleted once it has no products.</p>
      <div className="adm-form-foot">
        <Button type="button" onClick={onDone} variant="secondary" label="Cancel" />
        <Button type="submit" isDisabled={saving} variant="primary" label={saving ? "Saving…" : "Save categories"} />
      </div>
    </form>
  );
}
