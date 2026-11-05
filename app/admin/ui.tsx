"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { mediaUrl, uploadPhoto, type ImageRef } from "./lib";

export function Field({ label, hint, required, children, wide }: { label: string; hint?: string; required?: boolean; children: (id: string) => ReactNode; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`adm-field${wide ? " adm-wide" : ""}`}>
      <label htmlFor={id}>{label}{required && <b aria-hidden="true"> *</b>}</label>
      {children(id)}
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** Text input bound to a nullable string ("" ⇄ null). */
export function Text({ label, value, onChange, required, hint, placeholder, wide, list }: {
  label: string; value: string | null; onChange: (v: string | null) => void; required?: boolean; hint?: string; placeholder?: string; wide?: boolean; list?: string[];
}) {
  const listId = useId();
  return (
    <Field label={label} hint={hint} required={required} wide={wide}>
      {(id) => (
        <>
          <input id={id} value={value ?? ""} required={required} placeholder={placeholder} list={list ? listId : undefined}
            onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} />
          {list && <datalist id={listId}>{list.map((o) => <option key={o} value={o} />)}</datalist>}
        </>
      )}
    </Field>
  );
}

export function NumberInput({ label, value, onChange, hint, placeholder, min = 0 }: {
  label: string; value: number | null; onChange: (v: number | null) => void; hint?: string; placeholder?: string; min?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <input id={id} type="number" inputMode="decimal" min={min} step="any" value={value ?? ""} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
      )}
    </Field>
  );
}

export function Select({ label, value, options, onChange, required, allowEmpty }: {
  label: string; value: string | null; options: string[] | { value: string; label: string }[]; onChange: (v: string | null) => void; required?: boolean; allowEmpty?: boolean;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const known = opts.some((o) => o.value === value);
  return (
    <Field label={label} required={required}>
      {(id) => (
        <select id={id} value={value ?? ""} required={required} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}>
          {(allowEmpty || !value) && <option value="">{allowEmpty ? "—" : "Select…"}</option>}
          {value && !known && <option value={value}>{value}</option>}
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  );
}

export function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} value={value === null ? "" : value ? "yes" : "no"} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "yes")}>
          <option value="">Not specified</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      )}
    </Field>
  );
}

export function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

export function TextArea({ label, value, onChange, hint, rows = 6 }: { label: string; value: string | null; onChange: (v: string | null) => void; hint?: string; rows?: number }) {
  return (
    <Field label={label} hint={hint} wide>
      {(id) => <textarea id={id} rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} />}
    </Field>
  );
}

/** Editable list of rows with fixed text columns (specs, nearby places, documents). */
export function Rows<T extends Record<string, string>>({ label, rows, columns, onChange, addLabel, blank }: {
  label: string;
  rows: T[];
  columns: { key: keyof T & string; label: string; placeholder?: string; options?: string[] }[];
  onChange: (rows: T[]) => void;
  addLabel: string;
  blank: T;
}) {
  const update = (i: number, key: keyof T, value: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  return (
    <fieldset className="adm-rows adm-wide">
      <legend>{label}</legend>
      {rows.map((row, i) => (
        <div className="adm-row" key={i}>
          {columns.map((c) => c.options ? (
            <select key={c.key} aria-label={c.label} value={row[c.key]} onChange={(e) => update(i, c.key, e.target.value)}>
              {c.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : (
            <input key={c.key} aria-label={c.label} placeholder={c.placeholder ?? c.label} value={row[c.key]} onChange={(e) => update(i, c.key, e.target.value)} />
          ))}
          <button type="button" className="adm-icon-btn" aria-label={`Remove row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => onChange([...rows, { ...blank }])}>+ {addLabel}</button>
    </fieldset>
  );
}

/** Upload, reorder, caption and remove photos. Newly uploaded paths are reported so unsaved uploads can be cleaned up. */
export function Photos({ images, onChange, folder, max = 20, onUploaded }: {
  images: ImageRef[]; onChange: (images: ImageRef[]) => void; folder: "properties" | "products"; max?: number; onUploaded: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Latest list, so photos uploaded one after another append instead of overwriting.
  const latest = useRef(images);
  useEffect(() => { latest.current = images; }, [images]);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, Math.max(0, max - images.length));
    setBusy(list.length);
    for (const file of list) {
      try {
        const path = await uploadPhoto(file, folder);
        onUploaded(path);
        latest.current = [...latest.current, { path, alt: "" }];
        onChange(latest.current);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (input.current) input.current.value = "";
  }

  const move = (i: number, by: number) => {
    const next = [...images];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    onChange(next);
  };

  return (
    <div className="adm-photos adm-wide">
      <div className="adm-photo-grid">
        {images.map((img, i) => (
          <figure key={img.path}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(img.path)} alt="" />
            {i === 0 && max > 1 && <span className="adm-cover">Cover</span>}
            <input aria-label={`Caption for photo ${i + 1}`} placeholder="Caption (optional)" value={img.alt} onChange={(e) => onChange(images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
            <div className="adm-photo-actions">
              {max > 1 && <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier">←</button>}
              {max > 1 && <button type="button" disabled={i === images.length - 1} onClick={() => move(i, 1)} aria-label="Move later">→</button>}
              <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} aria-label="Remove photo">Remove</button>
            </div>
          </figure>
        ))}
        {images.length < max && (
          <button type="button" className="adm-photo-add" onClick={() => input.current?.click()} disabled={busy > 0}>
            {busy > 0 ? `Uploading ${busy}…` : max > 1 ? "+ Add photos" : "+ Add photo"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple={max > 1} hidden onChange={(e) => add(e.target.files)} />
      <small>Photos are resized automatically. {max > 1 && "The first photo is the cover. "}Use real photos of the property or product.</small>
      {error && <p className="adm-error" role="alert">{error}</p>}
    </div>
  );
}

export function Toast({ message, tone = "ok", onClose }: { message: string | null; tone?: "ok" | "error"; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className={`adm-toast adm-toast-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}
