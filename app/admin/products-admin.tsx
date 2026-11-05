"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CATEGORY_ICONS, slugify } from "@/lib/presets";
import { deletePhotos, emptyProduct, explain, mediaUrl, supabase, type CategoryRow, type ProductRow } from "./lib";
import { Check, NumberInput, Photos, Rows, Select, Text, TextArea } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;

export function ProductsAdmin({ notify }: { notify: Notify }) {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);

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

  return (
    <section>
      <div className="adm-toolbar">
        <h2>Construction products <small>{products ? products.length : "…"}</small></h2>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setManagingCategories(true)}>Categories</button>
        <button type="button" className="adm-btn" disabled={categories.length === 0} onClick={() => setEditing(emptyProduct(categories[0]?.id))}>+ New product</button>
      </div>
      {products === null ? <p className="adm-muted">Loading…</p> : categories.map((c) => {
        const items = products.filter((p) => p.category_id === c.id);
        return (
          <div key={c.id} className="adm-group">
            <h3>{c.name} <small>{items.length}</small></h3>
            {items.length === 0 ? <p className="adm-empty">No products in this category.</p> : (
              <ul className="adm-list">
                {items.map((p) => (
                  <li key={p.id}>
                    {p.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl(p.image_path)} alt="" />
                    ) : <span className="adm-thumb-empty">No photo</span>}
                    <div className="adm-list-main">
                      <strong>{p.name}</strong>
                      <span>{p.summary || "No summary"}{p.unit && ` · ${p.unit}`}</span>
                      <span className="adm-tags"><em className={p.published ? "adm-tag-live" : "adm-tag-draft"}>{p.published ? "Live" : "Draft"}</em></span>
                    </div>
                    <div className="adm-list-actions">
                      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => togglePublished(p)}>{p.published ? "Unpublish" : "Publish"}</button>
                      <button type="button" className="adm-btn" onClick={() => setEditing(p)}>Edit</button>
                      <button type="button" className="adm-btn adm-btn-danger" onClick={() => remove(p)}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

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
        <button type="button" className="adm-link" onClick={cancel}>← All products</button>
        <h2>{isNew ? "New product" : `Edit ${initial.name}`}</h2>
      </div>
      <fieldset><legend>Product</legend>
        <Text label="Name" value={p.name} onChange={(v) => setP((cur) => ({ ...cur, name: v ?? "", slug: isNew ? slugify(v ?? "") : cur.slug }))} required wide />
        <Select label="Category" value={p.category_id} options={categories.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => set("category_id", v ?? "")} required />
        <Text label="Pricing unit" value={p.unit} onChange={(v) => set("unit", v ?? "")} placeholder="e.g. Per tonne" list={["Per tonne", "Per bag", "Per sq ft", "Per running metre", "Per cubic metre", "Per unit", "Per project"]} />
        <NumberInput label="Sort order" value={p.sort_order} onChange={(v) => set("sort_order", Math.round(v ?? 0))} hint="Lower numbers appear first." />
        <TextArea label="Summary" value={p.summary} onChange={(v) => set("summary", v ?? "")} rows={2} />
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
        <button type="button" className="adm-btn adm-btn-ghost" onClick={cancel}>Cancel</button>
        <button type="submit" className="adm-btn" disabled={saving}>{saving ? "Saving…" : isNew ? "Create product" : "Save changes"}</button>
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
        <button type="button" className="adm-link" onClick={onDone}>← All products</button>
        <h2>Product categories</h2>
      </div>
      {rows.map((c, i) => (
        <fieldset key={c.id || `new-${i}`}>
          <legend>{c.name || "New category"}</legend>
          <Text label="Name" value={c.name} onChange={(v) => update(i, { name: v ?? "" })} required />
          <Select label="Icon" value={c.icon} options={CATEGORY_ICONS} onChange={(v) => update(i, { icon: v ?? "layers" })} />
          <TextArea label="Intro" value={c.intro} onChange={(v) => update(i, { intro: v ?? "" })} rows={2} />
          <div className="adm-inline adm-wide">
            <button type="button" className="adm-btn adm-btn-ghost" disabled={i === 0} onClick={() => setRows((rs) => { const n = [...rs]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>Move up</button>
            <button type="button" className="adm-btn adm-btn-danger" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
              {original.has(c.id) ? "Delete category" : "Remove"}
            </button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setRows((rs) => [...rs, { id: "", name: "", intro: "", icon: "layers", sort_order: rs.length + 1 }])}>+ Add category</button>
      <p className="adm-muted">A category can only be deleted once it has no products.</p>
      <div className="adm-form-foot">
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onDone}>Cancel</button>
        <button type="submit" className="adm-btn" disabled={saving}>{saving ? "Saving…" : "Save categories"}</button>
      </div>
    </form>
  );
}
