"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ArrowLeft, Check, FileText, Mail, Phone, X } from "lucide-react";
import { formatINR, formatINRShort } from "@/lib/format";
import { areaIn, categoryLabel } from "@/lib/property";
import {
  SELLER_TYPES, explain, mediaUrl, openDocument, supabase,
  type HistoryRow, type PropertyRow, type RevisionRow, type SellerDocument, type SellerProfile,
} from "./lib";
import { STAGE_LABEL, formatDate, formatWhen, historyLine, stageTone } from "./stages";
import { SectionHeader, StatCards, Thumb } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
type Item = { key: string; property: PropertyRow; revision: RevisionRow | null; seller: SellerProfile | null; since: string };
type View = "waiting" | "changes" | "sent_back" | "rejected";

// The reviewer's checklist (PRD section 11). Every box is ticked before approving.
const CHECKLIST = [
  "Photos are real photos of this property, with no watermarks or contact details",
  "Location and map link match the documents",
  "Price and area look right for the locality",
  "Ownership documents were opened and match the seller",
  "Description has no phone numbers and no promises of returns",
];

const FIELD_LABELS: Record<string, string> = {
  title: "Title", category: "Category", property_type: "Property type", transaction_type: "Transaction type", ownership: "Ownership", location: "Location", locality: "Locality",
  price: "Price", price_negotiable: "Price negotiable", area_sqft: "Area (sq ft)", area_unit: "Area shown in", dimensions: "Dimensions", facing: "Facing", bhk: "Bedrooms",
  bathrooms: "Bathrooms", carpet_area_sqft: "Carpet area", furnishing: "Furnishing", floor_info: "Floor", parking: "Parking", possession: "Possession", road_width_ft: "Road width",
  frontage_ft: "Frontage", land_use: "Land use", corner_plot: "Corner plot", boundary_wall: "Boundary wall", gated_layout: "Gated layout", floors_allowed: "Floors allowed",
  usable_area_sqft: "Usable area", access_notes: "Access", map_url: "Google Maps link", zoning_notes: "Zoning notes", approval: "Approval", rera: "RERA", availability: "Availability",
  description: "Description", amenities: "Amenities", nearby: "Nearby places", images: "Photos",
};
const show = (key: string, v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "price" && typeof v === "number") return formatINR(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (key === "images" && Array.isArray(v)) return `${v.length} photo${v.length === 1 ? "" : "s"}`;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : Object.values(x as object).filter(Boolean).join(" "))).join(", ") || "—";
  return String(v);
};
const sellerType = (s: SellerProfile | null) => SELLER_TYPES.find((t) => t.value === s?.seller_type)?.label ?? "Seller";

/** Staff queue for seller submissions and change requests to live listings. */
export function SubmissionsAdmin({ notify, onCount }: { notify: Notify; onCount: (n: number) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [view, setView] = useState<View>("waiting");
  const [open, setOpen] = useState<Item | null>(null);

  const load = useCallback(async () => {
    const [listingRes, revs, sellers] = await Promise.all([
      supabase().from("properties").select("*").in("stage", ["submitted", "under_review", "changes_requested", "rejected"]).order("submitted_at", { ascending: true }),
      supabase().from("property_revisions").select("*").eq("status", "pending").order("created_at", { ascending: true }),
      supabase().from("seller_profiles").select("*"),
    ]);
    const error = listingRes.error ?? revs.error ?? sellers.error;
    if (error) notify(explain(error), "error");
    const bySeller = new Map(((sellers.data ?? []) as SellerProfile[]).map((s) => [s.user_id, s]));
    const revisions = (revs.data ?? []) as RevisionRow[];
    const liveIds = revisions.map((r) => r.property_id);
    const live = liveIds.length ? ((await supabase().from("properties").select("*").in("id", liveIds)).data ?? []) as PropertyRow[] : [];
    const list: Item[] = [
      ...((listingRes.data ?? []) as PropertyRow[]).filter((p) => p.seller_id).map((p) => ({ key: p.id!, property: p, revision: null, seller: bySeller.get(p.seller_id!) ?? null, since: p.submitted_at ?? p.updated_at ?? "" })),
      ...revisions.flatMap((r) => { const p = live.find((x) => x.id === r.property_id); return p ? [{ key: r.id, property: p, revision: r, seller: bySeller.get(r.seller_id) ?? null, since: r.created_at }] : []; }),
    ];
    setItems(list);
    onCount(list.filter((i) => i.revision || i.property.stage === "submitted" || i.property.stage === "under_review").length);
  }, [notify, onCount]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, [load]);

  if (open) return <Review item={open} notify={notify} onDone={(changed) => { setOpen(null); if (changed) void load(); }} />;

  const all = items ?? [];
  const inView = (i: Item, v: View) => v === "changes" ? Boolean(i.revision)
    : v === "waiting" ? !i.revision && (i.property.stage === "submitted" || i.property.stage === "under_review")
    : v === "sent_back" ? !i.revision && i.property.stage === "changes_requested" : !i.revision && i.property.stage === "rejected";
  const visible = all.filter((i) => inView(i, view));
  const stat = (label: string, v: View, tone?: "warning" | "success") => ({ label, value: items ? all.filter((i) => inView(i, v)).length : "…", tone, isActive: view === v, onClick: () => setView(v) });

  const columns: TableColumn<Row>[] = [
    { key: "photo", header: "", width: pixel(76), renderCell: (i) => <Thumb src={i.property.images[0] ? mediaUrl(i.property.images[0].path) : null} /> },
    { key: "title", header: "Listing", width: proportional(3, { minWidth: 200 }), renderCell: (i) => (
      <VStack gap={0}>
        <Text weight="semibold" maxLines={2}>{i.property.title || "Untitled"}</Text>
        <Text type="supporting" maxLines={1}>{i.property.reference} · {i.property.property_type} · {i.property.location || "No location"}</Text>
      </VStack>
    ) },
    { key: "seller", header: "Seller", width: proportional(1.6, { minWidth: 140 }), renderCell: (i) => (
      <VStack gap={0}><Text maxLines={1}>{i.seller?.name ?? "Unknown"}</Text><Text type="supporting">{sellerType(i.seller)}</Text></VStack>
    ) },
    { key: "since", header: "Sent", width: proportional(1, { minWidth: 100 }), renderCell: (i) => <Text type="supporting">{formatDate(i.since)}</Text> },
    { key: "status", header: "Status", width: proportional(1.2, { minWidth: 130 }), renderCell: (i) => i.revision
      ? <Badge label="Change request" variant="info" />
      : <Badge label={STAGE_LABEL[i.property.stage]} variant={stageTone(i.property.stage)} /> },
    { key: "actions", header: "", width: pixel(110), align: "end", renderCell: (i) => <Button size="sm" variant="primary" label={inView(i, "waiting") || i.revision ? "Review" : "Open"} onClick={() => setOpen(i)} /> },
  ];

  return (
    <section>
      <SectionHeader title="Submissions" count={items ? all.filter((i) => inView(i, "waiting") || i.revision).length : null}
        description="Listings sent in by sellers, and their changes to live listings. Nothing reaches the website until you approve it." />
      <StatCards items={[stat("Waiting for review", "waiting", "warning"), stat("Change requests", "changes"), stat("Sent back to seller", "sent_back"), stat("Rejected", "rejected")]} />
      {items === null ? <p className="adm-muted">Loading…</p> : visible.length === 0 ? (
        <div className="adm-empty"><EmptyState isCompact title="Nothing here" description={view === "waiting" ? "No listings are waiting for review." : "Nothing in this list."} /></div>
      ) : (
        <Card padding={0} className="adm-table">
          <Table<Row> data={visible.map((i) => ({ ...i, id: i.key })) as Row[]} columns={columns} idKey="id" hasHover density="balanced" />
        </Card>
      )}
    </section>
  );
}

type Row = Item & { id: string } & Record<string, unknown>;

function Review({ item, notify, onDone }: { item: Item; notify: Notify; onDone: (changed: boolean) => void }) {
  const { property: p, revision, seller } = item;
  const [docs, setDocs] = useState<SellerDocument[] | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [ticked, setTicked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(p.stage);
  const decidable = revision ? true : stage === "submitted" || stage === "under_review";

  useEffect(() => {
    void supabase().from("seller_documents").select("*").eq("property_id", p.id!).order("created_at").then(({ data }) => setDocs((data ?? []) as SellerDocument[]));
    void supabase().rpc("listing_history", { listing: p.id }).then(({ data }) => setHistory((data ?? []) as HistoryRow[]));
  }, [p.id]);

  async function call(fn: string, args: Record<string, unknown>, done: string) {
    setBusy(true);
    const { error } = await supabase().rpc(fn, args);
    setBusy(false);
    if (error) { notify(explain(error), "error"); return false; }
    notify(done);
    return true;
  }
  async function start() {
    if (await call("review_listing", { listing: p.id, decision: "start" }, "Review started. The seller sees it as under review.")) setStage("under_review");
  }
  async function decide(decision: "approve" | "changes" | "reject") {
    if (decision !== "approve" && !note.trim()) return notify("Write a note telling the seller what to change, or why.", "error");
    if (decision === "reject" && !confirm("Reject this listing? The seller can’t resubmit it.")) return;
    const done = decision === "approve" ? "Approved. It goes live on the website in about 3 minutes." : decision === "changes" ? "Sent back to the seller with your note." : "Listing rejected.";
    if (await call("review_listing", { listing: p.id, decision, note: note.trim() || null }, done)) onDone(true);
  }
  async function decideRevision(decision: "approve" | "reject") {
    if (decision === "reject" && !note.trim()) return notify("Write a note telling the seller why.", "error");
    const done = decision === "approve" ? "Changes applied. The website updates in about 3 minutes." : "Change request declined.";
    if (await call("review_revision", { revision: revision!.id, decision, note: note.trim() || null }, done)) onDone(true);
  }
  async function openDoc(d: SellerDocument) {
    try { await openDocument(d.path); } catch (e) { notify(e instanceof Error ? e.message : "Couldn’t open it.", "error"); }
  }

  const allTicked = ticked.every(Boolean);
  const facts: [string, string][] = [
    ["Type", `${categoryLabel(p.category)} · ${p.property_type}`],
    ["Location", [p.location, p.locality].filter(Boolean).join(", ") || "—"],
    ["Price", p.price ? `${formatINRShort(p.price)} (${formatINR(p.price)})${p.price_negotiable ? ", negotiable" : ""}` : "On request"],
    ["Area", p.area_sqft ? `${areaIn(p.area_sqft, p.area_unit)}${p.area_unit !== "sqft" ? ` = ${areaIn(p.area_sqft, "sqft")}` : ""}` : "—"],
    ...(p.dimensions ? [["Dimensions", p.dimensions] as [string, string]] : []),
    ...(p.facing ? [["Facing", p.facing] as [string, string]] : []),
    ...(p.approval ? [["Approval (as stated)", p.approval] as [string, string]] : []),
    ...(p.ownership ? [["Ownership", p.ownership] as [string, string]] : []),
    ...(p.map_url ? [["Map", p.map_url] as [string, string]] : []),
  ];

  return (
    <div className="adm-form">
      <div className="adm-form-head">
        <Button type="button" onClick={() => onDone(stage !== p.stage)} variant="ghost" icon={<ArrowLeft size={16} />} label="All submissions" />
        <SectionHeader title={`${revision ? "Change request for" : "Review"} ${p.reference}`} description={p.title} />
      </div>
      <div className="adm-edit-grid">
        <div className="adm-edit-main">
          {revision && (
            <Card padding={5}>
              <VStack gap={3}>
                <Heading level={2}>Proposed changes</Heading>
                <Text type="supporting" as="p">Sent {formatWhen(revision.created_at)}. The live listing stays as it is until you apply them.</Text>
                <table className="adm-diff">
                  <thead><tr><th scope="col">Field</th><th scope="col">Now</th><th scope="col">Proposed</th></tr></thead>
                  <tbody>
                    {Object.entries(revision.changes).map(([k, v]) => (
                      <tr key={k}><th scope="row">{FIELD_LABELS[k] ?? k}</th><td>{show(k, (p as Record<string, unknown>)[k])}</td><td><strong>{show(k, v)}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
                {Array.isArray(revision.changes.images) && (
                  <div className="adm-review-photos">{revision.changes.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={img.path} href={mediaUrl(img.path, false)} target="_blank" rel="noreferrer"><img src={mediaUrl(img.path)} alt={img.alt || ""} /></a>
                  ))}</div>
                )}
              </VStack>
            </Card>
          )}
          <Card padding={5}>
            <VStack gap={4}>
              <HStack gap={2} vAlign="center"><Heading level={2}>{revision ? "Live listing" : "Listing"}</Heading><Badge label={STAGE_LABEL[stage]} variant={stageTone(stage)} /></HStack>
              <div className="adm-review-photos">
                {p.images.length === 0 ? <Text color="secondary">No photos.</Text> : p.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={img.path} href={mediaUrl(img.path, false)} target="_blank" rel="noreferrer" aria-label="Open photo full size"><img src={mediaUrl(img.path)} alt={img.alt || ""} /></a>
                ))}
              </div>
              <dl className="sel-summary">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{k === "Map" ? <a href={v} target="_blank" rel="noreferrer">Open map</a> : v}</dd></div>)}</dl>
              <VStack gap={1}>
                <Text weight="semibold">Description</Text>
                {(p.description ?? "").split(/\n\s*\n/).filter(Boolean).map((para, i) => <Text key={i} as="p" display="block">{para}</Text>)}
              </VStack>
            </VStack>
          </Card>
          <Card padding={5}>
            <VStack gap={3}>
              <Heading level={2}>Private documents</Heading>
              {docs === null ? <Text color="secondary">Loading…</Text> : docs.length === 0 ? <Banner status="warning" title="No documents uploaded" description="Ask the seller for ownership documents before approving." /> : (
                <ul className="sel-docs">
                  {docs.map((d) => (
                    <li key={d.id}>
                      <FileText size={18} aria-hidden="true" />
                      <VStack gap={0}><Text weight="semibold">{d.label}</Text><Text type="supporting">{d.file_name} · {formatDate(d.created_at)}</Text></VStack>
                      <Button size="sm" label="Open" onClick={() => void openDoc(d)} />
                    </li>
                  ))}
                </ul>
              )}
            </VStack>
          </Card>
          <Card padding={5}>
            <VStack gap={3}>
              <Heading level={2}>History</Heading>
              <ol className="adm-timeline">
                {history.map((h, i) => (
                  <li key={i}><Text type="supporting">{formatWhen(h.at)}</Text> <Text>{historyLine(h)}{h.by_seller ? " (seller)" : ""}</Text>{h.note && <Text color="secondary" as="p">“{h.note}”</Text>}</li>
                ))}
              </ol>
            </VStack>
          </Card>
        </div>

        <aside className="adm-edit-side" aria-label="Decision">
          <Card padding={5}>
            <VStack gap={3}>
              <Heading level={2}>Seller</Heading>
              <VStack gap={1}>
                <Text weight="semibold">{seller?.name ?? "Unknown"}</Text>
                <Text type="supporting">{sellerType(seller)}{seller?.company ? ` · ${seller.company}` : ""}{seller?.status === "suspended" ? " · Suspended" : ""}</Text>
              </VStack>
              {seller && (
                <VStack gap={1}>
                  <a className="adm-contact" href={`tel:${seller.phone.replace(/[^0-9+]/g, "")}`}><Phone size={14} aria-hidden="true" /> {seller.phone}</a>
                  <a className="adm-contact" href={`mailto:${seller.email}`}><Mail size={14} aria-hidden="true" /> {seller.email}</a>
                  <Text type="supporting">Joined {formatDate(seller.created_at)}</Text>
                </VStack>
              )}
            </VStack>
          </Card>
          <Card padding={5}>
            <VStack gap={4}>
              <Heading level={2}>Decision</Heading>
              {!decidable ? (
                <Text color="secondary" as="p">{stage === "changes_requested" ? "Waiting for the seller to make the changes and send it again." : "This listing was rejected."}{p.review_note ? ` Your note: “${p.review_note}”` : ""}</Text>
              ) : (
                <>
                  {!revision && stage === "submitted" && <Button width="100%" isDisabled={busy} onClick={() => void start()} label="Start review" />}
                  {!revision && (
                    <fieldset className="adm-checklist">
                      <legend>Checklist</legend>
                      {CHECKLIST.map((c, i) => <CheckboxInput key={c} label={c} value={ticked[i]} onChange={(v) => setTicked((t) => t.map((x, j) => (j === i ? v : x)))} />)}
                    </fieldset>
                  )}
                  <TextArea label="Note to the seller" description={revision ? "Needed to decline." : "Needed to send back or reject. The seller sees it."} rows={4} value={note} onChange={setNote} />
                  <Divider />
                  {revision ? (
                    <VStack gap={2}>
                      <Button width="100%" variant="primary" isDisabled={busy} icon={<Check size={16} />} onClick={() => void decideRevision("approve")} label="Apply changes" />
                      <Button width="100%" isDisabled={busy} icon={<X size={16} />} onClick={() => void decideRevision("reject")} label="Decline changes" />
                    </VStack>
                  ) : (
                    <VStack gap={2}>
                      <Button width="100%" variant="primary" isDisabled={busy || !allTicked} tooltip={allTicked ? undefined : "Tick every item on the checklist first"} icon={<Check size={16} />} onClick={() => void decide("approve")} label="Approve and publish" />
                      <Button width="100%" isDisabled={busy} onClick={() => void decide("changes")} label="Request changes" />
                      <Button width="100%" variant="ghost" isDisabled={busy} onClick={() => void decide("reject")} label="Reject" />
                    </VStack>
                  )}
                </>
              )}
            </VStack>
          </Card>
        </aside>
      </div>
    </div>
  );
}
