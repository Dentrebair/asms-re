"use client";

import { Button } from "@astryxdesign/core/Button";
import { RefreshCw } from "lucide-react";
import { SectionHeader } from "./ui";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { DateInput } from "@astryxdesign/core/DateInput";
import type { ISODateString } from "@astryxdesign/core/Calendar";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";

const NOBODY = "__nobody__";
import { useEffect, useState } from "react";
import { explain, supabase, type EnquiryHistoryRow, type EnquiryRow, type EnquiryStatus, type StaffRow } from "./lib";

type Notify = (message: string, tone?: "ok" | "error") => void;

// Lead statuses from PRD section 12, in workflow order.
export const STATUSES: { value: EnquiryStatus; label: string; open: boolean }[] = [
  { value: "new", label: "New", open: true },
  { value: "visit_requested", label: "Visit requested", open: true },
  { value: "contacted", label: "Contacted", open: true },
  { value: "qualified", label: "Qualified", open: true },
  { value: "negotiation", label: "Negotiation", open: true },
  { value: "closed_won", label: "Closed: won", open: false },
  { value: "closed_lost", label: "Closed: lost", open: false },
  { value: "not_interested", label: "Not interested", open: false },
];
const statusLabel = (s: string | null) => STATUSES.find((x) => x.value === s)?.label ?? s ?? "";
/** Waiting for a first response: counted on the tab badge. */
export const isFresh = (r: Pick<EnquiryRow, "status">) => r.status === "new" || r.status === "visit_requested";
const isOpen = (r: EnquiryRow) => STATUSES.find((x) => x.value === r.status)?.open ?? true;

const KIND_LABEL: Record<EnquiryRow["kind"], string> = { property: "Property enquiry", visit: "Site visit request", product: "Product quote", sell: "Owner wants to sell", general: "General enquiry" };

type View = "fresh" | "open" | "due" | "closed" | "all";
const today = () => new Date().toLocaleDateString("en-CA");
const VIEWS: { value: View; label: string; test: (r: EnquiryRow) => boolean }[] = [
  { value: "fresh", label: "New", test: isFresh },
  { value: "open", label: "Open", test: isOpen },
  { value: "due", label: "Follow-up due", test: (r) => isOpen(r) && !!r.follow_up_on && r.follow_up_on <= today() },
  { value: "closed", label: "Closed", test: (r) => !isOpen(r) },
  { value: "all", label: "All", test: () => true },
];

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const day = (iso: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

/** Digits only, with India's 91 added to a 10-digit mobile number, for WhatsApp links. */
const whatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

export function EnquiriesAdmin({ me, notify, onNewCount }: { me: StaffRow; notify: Notify; onNewCount: (n: number) => void }) {
  const [rows, setRows] = useState<EnquiryRow[] | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [view, setView] = useState<View>("fresh");
  const [mine, setMine] = useState(false);

  async function load() {
    const [{ data, error }, team] = await Promise.all([
      supabase().from("enquiries").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase().from("staff").select("email,name,role").order("name"),
    ]);
    if (error) return notify(explain(error), "error");
    const list = data as EnquiryRow[];
    setRows(list);
    setStaff((team.data as StaffRow[] | null) ?? []);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, []);

  async function save(row: EnquiryRow, change: Partial<Pick<EnquiryRow, "status" | "notes" | "assigned_to" | "follow_up_on">>, message?: string) {
    const { error } = await supabase().from("enquiries").update(change).eq("id", row.id);
    if (error) return notify(explain(error), "error");
    if (message) notify(message);
    // Build on the latest list: two quick edits must not undo each other.
    setRows((cur) => (cur ?? []).map((r) => (r.id === row.id ? { ...r, ...change } : r)));
  }

  async function remove(row: EnquiryRow) {
    if (!confirm(`Delete the enquiry from ${row.name}? This cannot be undone.`)) return;
    const { error } = await supabase().from("enquiries").delete().eq("id", row.id);
    if (error) return notify(explain(error), "error");
    notify("Enquiry deleted.");
    setRows((cur) => (cur ?? []).filter((r) => r.id !== row.id));
  }

  // Keep the tab badge in step with the list.
  useEffect(() => { if (rows) onNewCount(rows.filter(isFresh).length); }, [rows, onNewCount]);

  const inScope = (rows ?? []).filter((r) => !mine || r.assigned_to === me.email);
  const count = (v: View) => inScope.filter(VIEWS.find((x) => x.value === v)!.test).length;
  const shown = inScope.filter(VIEWS.find((x) => x.value === view)!.test);
  const staffName = (email: string | null) => staff.find((s) => s.email === email)?.name || email;

  return (
    <section>
      <SectionHeader title="Enquiries" count={rows ? rows.length : null} description="Everything sent from the website: property enquiries, visit requests, quotes and sell requests.">
        <Button type="button" onClick={() => void load()} variant="secondary" icon={<RefreshCw size={16} />} label="Refresh" />
      </SectionHeader>
      <div className="adm-toolbar">
        <div className="adm-filter">
          <SegmentedControl label="Show enquiries" value={view} onChange={(v) => setView(v as typeof view)} size="sm">
            {VIEWS.map((v) => <SegmentedControlItem key={v.value} value={v.value} label={`${v.label} ${count(v.value)}`} />)}
          </SegmentedControl>
        </div>
        <CheckboxInput label="Assigned to me" value={mine} onChange={(v) => setMine(v)} />
      </div>

      {rows && shown.length === 0 && (
        <div className="adm-empty"><EmptyState isCompact title={view === "fresh" ? "No new enquiries" : "Nothing here"} description={view === "fresh" ? "Anything sent from the website appears here." : undefined} /></div>
      )}

      <ul className="adm-enquiries">
        {shown.map((r) => (
          <li key={r.id} data-status={r.status}>
            <div className="adm-enquiry-head">
              <div>
                <strong>{r.name}</strong>
                <span className="adm-muted">{when(r.created_at)} · {KIND_LABEL[r.kind]}{r.source === "property_page" ? " from the property page" : r.source === "product_page" ? " from the product page" : ""}</span>
                {r.repeat_contact && <span className="adm-flag">Sent another enquiry in the last 30 days</span>}
              </div>
              <Selector label={`Status for ${r.name}`} isLabelHidden size="sm" value={r.status} options={STATUSES} onChange={(v) => void save(r, { status: v as EnquiryStatus })} />
            </div>
            <div className="adm-enquiry-contact">
              <Button variant="primary" size="sm" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} label={`Call ${r.phone}`} />
              <Button size="sm" href={whatsapp(r.phone)} target="_blank" rel="noopener noreferrer" label="WhatsApp" />
              {r.email && <Button size="sm" label={`Email ${r.email}`} href={`mailto:${r.email}?subject=${encodeURIComponent(`Your enquiry to ASMS-ROUNAQH${r.property_ref ? `: ${r.property_ref}` : r.interest ? `: ${r.interest}` : ""}`)}`} />}
            </div>
            <dl className="adm-enquiry-facts">
              {r.property_ref && <div><dt>Property</dt><dd><a className="adm-link" href={`/properties?q=${encodeURIComponent(r.property_ref)}`} target="_blank" rel="noopener noreferrer">{r.property_ref}</a>{!r.property_id && " (reference not found)"}{r.interest && r.interest !== r.property_ref ? `, ${r.interest}` : ""}</dd></div>}
              {!r.property_ref && r.interest && <div><dt>Interested in</dt><dd>{r.interest}</dd></div>}
              {r.kind === "visit" && <div><dt>Preferred visit</dt><dd>{r.preferred_date ? day(r.preferred_date) : "Any day"}, {r.preferred_time ?? "any time"}</dd></div>}
              {r.product_slug && <div><dt>Product</dt><dd>{r.product_slug}</dd></div>}
              {r.quantity && <div><dt>Quantity</dt><dd>{r.quantity}</dd></div>}
              {r.delivery_location && <div><dt>Deliver to</dt><dd>{r.delivery_location}</dd></div>}
              {r.organisation && <div><dt>Organisation</dt><dd>{r.organisation}</dd></div>}
            </dl>
            {r.message && <p className="adm-enquiry-message">{r.message}</p>}
            <div className="adm-enquiry-work">
              <Selector label="Handled by" size="sm" value={r.assigned_to ?? NOBODY}
                options={[{ value: NOBODY, label: "Nobody yet" }, ...staff.map((s) => ({ value: s.email, label: `${s.name || s.email}${s.email === me.email ? " (you)" : ""}` }))]}
                onChange={(v) => void save(r, { assigned_to: v === NOBODY ? null : v })} />
              <DateInput label="Follow up on" size="sm" hasClear value={(r.follow_up_on || undefined) as ISODateString | undefined}
                onChange={(v) => void save(r, { follow_up_on: v || null })} />
            </div>
            <Notes row={r} onSave={(notes) => save(r, { notes }, "Note saved.")} />
            <div className="adm-enquiry-foot">
              <History row={r} staffName={staffName} />
              <Button type="button" onClick={() => void remove(r)} variant="destructive" label="Delete" />
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
      <TextArea label="Staff notes" description="Only staff see these." rows={2} maxLength={4000} value={value} onChange={setValue} placeholder="Example: Called 12 Nov, site visit on Saturday" />
      <Button type="button" isDisabled={!dirty} onClick={() => void onSave(value.trim() || null)} variant="secondary" label="Save note" />
    </div>
  );
}

/** The timestamped change log for one enquiry, loaded when opened. */
function History({ row, staffName }: { row: EnquiryRow; staffName: (email: string | null) => string | null }) {
  const [items, setItems] = useState<EnquiryHistoryRow[] | null>(null);
  async function open(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open) return;
    const { data } = await supabase().from("enquiry_history").select("*").eq("enquiry_id", row.id).order("at", { ascending: false });
    setItems((data as EnquiryHistoryRow[] | null) ?? []);
  }
  const describe = (h: EnquiryHistoryRow) =>
    h.field === "status" ? `status ${statusLabel(h.old_value)} → ${statusLabel(h.new_value)}`
      : h.field === "assigned_to" ? `handled by ${staffName(h.new_value) ?? "nobody"}`
        : h.field === "follow_up_on" ? `follow-up ${h.new_value ? day(h.new_value) : "cleared"}`
          : "notes edited";
  return (
    <details className="adm-history" onToggle={open}>
      <summary>History</summary>
      {items === null ? <p className="adm-muted">Loading…</p> : items.length === 0 ? <p className="adm-muted">No changes yet.</p> : (
        <ol>{items.map((h) => <li key={h.id}><time dateTime={h.at}>{when(h.at)}</time> {staffName(h.actor) ?? "Someone"}: {describe(h)}</li>)}</ol>
      )}
    </details>
  );
}
