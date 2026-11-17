"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import { TextArea as AstryxTextArea } from "@astryxdesign/core/TextArea";
import { NumberInput as AstryxNumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { Button } from "@astryxdesign/core/Button";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading, Text as TextLine } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { IconButton } from "@astryxdesign/core/IconButton";
import { mediaUrl, uploadPhoto, type ImageRef } from "./lib";
import { iconFor } from "./field-icons";

/** Wraps a field in the admin form grid; `wide` spans the full row. */
function Cell({ wide, children }: { wide?: boolean; children: ReactNode }) {
  return <div className={`adm-field${wide ? " adm-wide" : ""}`}>{children}</div>;
}

/** Text input bound to a nullable string ("" ⇄ null).
 *  `grow` renders a one-line value in an Astryx TextArea that wraps and grows with its
 *  content (CSS field-sizing), so long values stay readable; line breaks are kept out of the value. */
export function Text({ label, value, onChange, required, hint, placeholder, wide, list, grow }: {
  label: string; value: string | null; onChange: (v: string | null) => void; required?: boolean; hint?: string; placeholder?: string; wide?: boolean; list?: string[]; grow?: boolean;
}) {
  const listId = useId();
  const emit = (v: string) => onChange(v === "" ? null : v);
  return (
    <Cell wide={wide}>
      {grow ? (
        <AstryxTextArea label={label} description={hint} value={value ?? ""} isRequired={required} placeholder={placeholder} rows={3} startIcon={iconFor(label)}
          controlClassName="adm-grow" hasSpellCheck onChange={(v) => emit(v.replace(/\s*\n\s*/g, " "))} />
      ) : (
        <>
          <TextInput label={label} description={hint} value={value ?? ""} isRequired={required} placeholder={placeholder} startIcon={iconFor(label)}
            {...(list ? { list: listId } : {})} onChange={emit} />
          {list && <datalist id={listId}>{list.map((o) => <option key={o} value={o} />)}</datalist>}
        </>
      )}
    </Cell>
  );
}

export function NumberInput({ label, value, onChange, hint, placeholder, min = 0 }: {
  label: string; value: number | null; onChange: (v: number | null) => void; hint?: string; placeholder?: string; min?: number;
}) {
  return (
    <Cell>
      <AstryxNumberInput label={label} description={hint} value={value} placeholder={placeholder} min={min} hasClear startIcon={iconFor(label)}
        onChange={(v: number | null) => onChange(v ?? null)} />
    </Cell>
  );
}

const EMPTY = "__empty__";

export function Select({ label, value, options, onChange, required, allowEmpty }: {
  label: string; value: string | null; options: string[] | { value: string; label: string }[]; onChange: (v: string | null) => void; required?: boolean; allowEmpty?: boolean;
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const known = opts.some((o) => o.value === value);
  const all = [
    ...(allowEmpty ? [{ value: EMPTY, label: "—" }] : []),
    ...(value && !known ? [{ value, label: value }] : []),
    ...opts,
  ];
  return (
    <Cell>
      <Selector label={label} isRequired={required} placeholder="Select…" options={all} startIcon={iconFor(label)}
        value={value ?? (allowEmpty ? EMPTY : "")} onChange={(v) => onChange(v === EMPTY || v === "" ? null : v)} />
    </Cell>
  );
}

export function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <Cell>
      <Selector label={label} value={value === null ? EMPTY : value ? "yes" : "no"}
        options={[{ value: EMPTY, label: "Not specified" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
        onChange={(v) => onChange(v === EMPTY ? null : v === "yes")} />
    </Cell>
  );
}

export function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return <CheckboxInput label={label} description={hint} value={checked} onChange={(v) => onChange(v)} />;
}

export function TextArea({ label, value, onChange, hint, rows = 12 }: { label: string; value: string | null; onChange: (v: string | null) => void; hint?: string; rows?: number }) {
  return (
    <Cell wide>
      <AstryxTextArea label={label} description={hint} rows={rows} value={value ?? ""} controlClassName="adm-long"
        onChange={(v) => onChange(v === "" ? null : v)} />
    </Cell>
  );
}

/** A date field bound to an ISO date string or null. */
export function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Cell>
      <DateInput label={label} value={(value || undefined) as ISODateString | undefined} hasClear onChange={(v) => onChange(v ?? null)} />
    </Cell>
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
            <Selector key={c.key} label={c.label} isLabelHidden value={row[c.key]} options={c.options} onChange={(v) => update(i, c.key, v)} />
          ) : (
            <TextInput key={c.key} label={c.label} isLabelHidden placeholder={c.placeholder ?? c.label} value={row[c.key]} onChange={(v) => update(i, c.key, v)} />
          ))}
          <IconButton label={`Remove row ${i + 1}`} icon={<span aria-hidden="true">✕</span>} variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div><Button label={`+ ${addLabel}`} variant="secondary" size="sm" onClick={() => onChange([...rows, { ...blank }])} /></div>
    </fieldset>
  );
}

/** Upload, reorder, caption and remove photos. Newly uploaded paths are reported so unsaved uploads can be cleaned up. */
export function Photos({ images, onChange, folder, max = 20, onUploaded, hint }: {
  images: ImageRef[]; onChange: (images: ImageRef[]) => void; folder: string; max?: number; onUploaded: (path: string) => void; hint?: string;
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
            {i === 0 && max > 1 && <span className="adm-cover"><Badge label="Cover" variant="warning" /></span>}
            <TextInput label={`Caption for photo ${i + 1}`} isLabelHidden size="sm" placeholder="Caption (optional)" value={img.alt} onChange={(v) => onChange(images.map((x, j) => (j === i ? { ...x, alt: v } : x)))} />
            <div className="adm-photo-actions">
              {max > 1 && <IconButton size="sm" variant="ghost" isDisabled={i === 0} onClick={() => move(i, -1)} label="Move earlier" icon={<span aria-hidden="true">←</span>} />}
              {max > 1 && <IconButton size="sm" variant="ghost" isDisabled={i === images.length - 1} onClick={() => move(i, 1)} label="Move later" icon={<span aria-hidden="true">→</span>} />}
              <Button size="sm" variant="ghost" onClick={() => onChange(images.filter((_, j) => j !== i))} label="Remove" />
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
      <small>Photos are resized automatically. {max > 1 && "The first photo is the cover. "}Use real photos of the property or product.{hint ? ` ${hint}` : ""}</small>
      {error && <Banner status="error" title={error} />}
    </div>
  );
}

export function Toast({ message, tone = "ok", onClose }: { message: string | null; tone?: "ok" | "error"; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className={`adm-toast adm-toast-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Banner status={tone === "error" ? "error" : "success"} container="card" elevation="high" isDismissable onDismiss={onClose} dismissLabel="Dismiss"
        title={<span data-toast-message>{message}</span>} />
    </div>
  );
}

/** Portal section header: title with count, a line of description, and actions on the right. */
export function SectionHeader({ title, count, description, children }: { title: string; count?: number | null; description?: string; children?: ReactNode }) {
  return (
    <div className="adm-section-head">
      <VStack gap={1}>
        <HStack gap={2} vAlign="center">
          <Heading level={1}>{title}</Heading>
          {count !== undefined && <Badge label={count === null ? "…" : String(count)} variant="neutral" />}
        </HStack>
        {description && <TextLine type="supporting" as="p">{description}</TextLine>}
      </VStack>
      {children && <HStack gap={2} wrap="wrap">{children}</HStack>}
    </div>
  );
}

/** A row of summary figures; each can filter the list below when clicked. */
export function StatCards({ items }: { items: { label: string; value: number | string; tone?: "warning" | "success"; onClick?: () => void; isActive?: boolean }[] }) {
  return (
    <div className="adm-stats">
      {items.map((s) => {
        const body = (
          <VStack gap={0}>
            <TextLine type="supporting">{s.label}</TextLine>
            <TextLine type="display-3" weight="bold" hasTabularNumbers className={s.tone ? `adm-stat-${s.tone}` : undefined}>{s.value}</TextLine>
          </VStack>
        );
        return s.onClick ? (
          <ClickableCard key={s.label} label={`${s.label}: ${s.value}`} onClick={s.onClick} padding={4} className={s.isActive ? "adm-stat is-active" : "adm-stat"}>{body}</ClickableCard>
        ) : (
          <Card key={s.label} padding={4} className="adm-stat">{body}</Card>
        );
      })}
    </div>
  );
}

/** Small photo for table rows, or a placeholder. */
export function Thumb({ src }: { src: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="adm-thumb" src={src} alt="" /> : <span className="adm-thumb adm-thumb-empty" aria-hidden="true">No photo</span>;
}
