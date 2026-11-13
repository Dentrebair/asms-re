"use client";

import { useEffect, useState } from "react";
import { explain, supabase, type EnquiryRow, type EnquiryStatus } from "./lib";

type Notify = (message: string, tone?: "ok" | "error") => void;

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Digits only, with India's 91 added to a 10-digit mobile number, for WhatsApp links. */
const whatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

export function EnquiriesAdmin({ notify, onNewCount }: { notify: Notify; onNewCount: (n: number) => void }) {
  const [rows, setRows] = useState<EnquiryRow[] | null>(null);
  const [filter, setFilter] = useState<EnquiryStatus | "all">("new");

  async function load() {
    const { data, error } = await supabase().from("enquiries").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return notify(explain(error), "error");
    const list = data as EnquiryRow[];
    setRows(list);
    onNewCount(list.filter((r) => r.status === "new").length);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, []);

  async function save(row: EnquiryRow, change: Partial<Pick<EnquiryRow, "status" | "notes">>, message?: string) {
    const { error } = await supabase().from("enquiries").update(change).eq("id", row.id);
    if (error) return notify(explain(error), "error");
    if (message) notify(message);
    const next = (rows ?? []).map((r) => (r.id === row.id ? { ...r, ...change } : r));
    setRows(next);
    onNewCount(next.filter((r) => r.status === "new").length);
  }

  async function remove(row: EnquiryRow) {
    if (!confirm(`Delete the enquiry from ${row.name}? This cannot be undone.`)) return;
    const { error } = await supabase().from("enquiries").delete().eq("id", row.id);
    if (error) return notify(explain(error), "error");
    notify("Enquiry deleted.");
    const next = (rows ?? []).filter((r) => r.id !== row.id);
    setRows(next);
    onNewCount(next.filter((r) => r.status === "new").length);
  }

  const count = (s: EnquiryStatus | "all") => (rows ?? []).filter((r) => s === "all" || r.status === s).length;
  const shown = (rows ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <section>
      <div className="adm-toolbar">
        <h2>Enquiries <small>{rows ? rows.length : "…"}</small></h2>
        <div className="adm-filter" role="group" aria-label="Show enquiries">
          {[...STATUSES, { value: "all" as const, label: "All" }].map((s) => (
            <button key={s.value} type="button" aria-pressed={filter === s.value} onClick={() => setFilter(s.value)}>
              {s.label} <span>{count(s.value)}</span>
            </button>
          ))}
        </div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => void load()}>Refresh</button>
      </div>

      {rows && shown.length === 0 && (
        <p className="adm-empty">{filter === "new" ? "No new enquiries. Anything sent from the website’s contact page appears here." : "Nothing here."}</p>
      )}

      <ul className="adm-enquiries">
        {shown.map((r) => (
          <li key={r.id} data-status={r.status}>
            <div className="adm-enquiry-head">
              <div>
                <strong>{r.name}</strong>
                <span className="adm-muted">{when(r.created_at)} · {r.category}</span>
              </div>
              <select aria-label={`Status for ${r.name}`} value={r.status} onChange={(e) => void save(r, { status: e.target.value as EnquiryStatus })}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="adm-enquiry-contact">
              <a className="adm-btn" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>Call {r.phone}</a>
              <a className="adm-btn adm-btn-ghost" href={whatsapp(r.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {r.email && <a className="adm-btn adm-btn-ghost" href={`mailto:${r.email}?subject=${encodeURIComponent(`Your enquiry to ASMS-ROUNAQH${r.interest ? `: ${r.interest}` : ""}`)}`}>Email {r.email}</a>}
            </div>
            {r.interest && <p className="adm-enquiry-interest">Interested in: <strong>{r.interest}</strong></p>}
            <p className="adm-enquiry-message">{r.message}</p>
            <Notes row={r} onSave={(notes) => save(r, { notes }, "Note saved.")} />
            <div className="adm-enquiry-foot">
              <button type="button" className="adm-btn adm-btn-danger" onClick={() => void remove(r)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notes({ row, onSave }: { row: EnquiryRow; onSave: (notes: string | null) => Promise<void> }) {
  const [value, setValue] = useState(row.notes ?? "");
  const dirty = value.trim() !== (row.notes ?? "");
  return (
    <div className="adm-enquiry-notes">
      <label className="adm-field">
        <span className="adm-label">Staff notes (only staff see these)</span>
        <textarea rows={2} maxLength={4000} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Example: Called 12 Nov, site visit on Saturday" />
      </label>
      <button type="button" className="adm-btn adm-btn-ghost" disabled={!dirty} onClick={() => void onSave(value.trim() || null)}>Save note</button>
    </div>
  );
}
