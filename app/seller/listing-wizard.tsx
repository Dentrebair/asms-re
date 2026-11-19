"use client";

import { useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Selector } from "@astryxdesign/core/Selector";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ArrowLeft, ArrowRight, FileText, Send, Trash2, Upload } from "lucide-react";
import { formatINR } from "@/lib/format";
import { areaIn, categoryLabel } from "@/lib/property";
import {
  DOCUMENT_TYPES, SELLER_FIELDS, deleteDocuments, deletePhotos, explain, listingGaps, openDocument, pickSellerFields, supabase, uploadDocument,
  type PropertyRow, type SellerDocument, type SellerProfile,
} from "../admin/lib";
import { AmenitiesSection, CategorySelects, LegalSection, LocationSection, NearbyRows, PriceSizeSection, TypeDetailsSection } from "../admin/listing-fields";
import { Photos, Text as TextField } from "../admin/ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
type SaveState = "idle" | "saving" | "saved" | "error";

const STEPS = [
  { label: "The property", description: "Type and title" },
  { label: "Location", description: "Where it is" },
  { label: "Price & details", description: "What buyers ask" },
  { label: "Photos", description: "Pictures & documents" },
  { label: "Review & send", description: "Check, then submit" },
];
const DOC_LABELS = ["Patta", "Chitta", "Encumbrance certificate (EC)", "Sale deed", "Approved plan", "Building approval", "Property tax receipt", "Other"];

/**
 * The seller's listing, in five steps. A draft saves itself a moment after each change
 * (only the seller fields; the database ignores anything else). For a live listing the same
 * steps collect a change request instead, which staff review before it reaches the website.
 */
export function ListingWizard({ initial, isNew, profile, notify, onDone }: {
  initial: PropertyRow; isNew: boolean; profile: SellerProfile; notify: Notify; onDone: (changed: boolean) => void;
}) {
  const mode: "draft" | "revision" = initial.stage === "live" || initial.stage === "paused" ? "revision" : "draft";
  const [p, setP] = useState<PropertyRow>(initial);
  const [step, setStep] = useState(0);
  const [save, setSave] = useState<SaveState>(isNew ? "idle" : "saved");
  const [declared, setDeclared] = useState(false);
  const [sending, setSending] = useState(false);
  const created = useRef(!isNew);
  const dirty = useRef(false);
  const saving = useRef<Promise<boolean> | null>(null);
  const latest = useRef(p);
  useEffect(() => { latest.current = p; }, [p]);

  const set = <K extends keyof PropertyRow>(key: K, value: PropertyRow[K]) => { dirty.current = true; setP((cur) => ({ ...cur, [key]: value })); };
  const setPTracked: typeof setP = (v) => { dirty.current = true; setP(v); };
  const fields = { p, set, setP: setPTracked };

  /** Writes the draft now; returns false when it couldn't. */
  async function persist(): Promise<boolean> {
    if (mode !== "draft") return true;
    if (saving.current) await saving.current;
    if (!dirty.current && created.current) return true;
    const run = (async () => {
      dirty.current = false;
      setSave("saving");
      const row = { ...pickSellerFields(latest.current), nearby: latest.current.nearby.filter((n) => n.name.trim()) };
      const { error } = created.current
        ? await supabase().from("properties").update(row).eq("id", initial.id!)
        : await supabase().from("properties").insert({ id: initial.id, ...row });
      if (error) { dirty.current = true; setSave("error"); notify(explain(error), "error"); return false; }
      created.current = true;
      setSave("saved");
      return true;
    })();
    saving.current = run;
    const ok = await run;
    saving.current = null;
    return ok;
  }

  // Autosave a draft 1.2 s after the last change.
  useEffect(() => {
    if (mode !== "draft" || !dirty.current) return;
    const t = setTimeout(() => void persist(), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist reads refs
  }, [p, mode]);

  // Photos removed from a draft are deleted from storage once the draft no longer points at them.
  const removedPhotos = useRef<string[]>([]);
  function setImages(images: PropertyRow["images"]) {
    const gone = p.images.filter((i) => !images.some((x) => x.path === i.path)).map((i) => i.path);
    if (mode === "draft") removedPhotos.current.push(...gone.filter((path) => path.startsWith("sellers/")));
    set("images", images);
  }
  useEffect(() => {
    if (save !== "saved" || removedPhotos.current.length === 0) return;
    const paths = removedPhotos.current.splice(0);
    void deletePhotos(paths);
  }, [save]);

  async function goTo(next: number) {
    if (mode === "draft" && dirty.current) await persist();
    setStep(next);
    document.querySelector(".sel-wizard")?.scrollIntoView({ block: "start" });
  }

  async function finishLater() {
    if (!(await persist())) return;
    onDone(created.current);
  }

  async function send() {
    const gaps = listingGaps(p);
    if (gaps.length) return notify(`Still needed: ${gaps.join(", ")}.`, "error");
    setSending(true);
    if (mode === "draft") {
      if (!(await persist())) return setSending(false);
      const { error } = await supabase().rpc("submit_listing", { listing: initial.id });
      setSending(false);
      if (error) return notify(explain(error), "error");
      notify("Sent for review. We’ll let you know here once it has been checked.");
    } else {
      const changes = Object.fromEntries(SELLER_FIELDS.filter((k) => JSON.stringify(p[k]) !== JSON.stringify(initial[k])).map((k) => [k, p[k]]));
      if (Object.keys(changes).length === 0) { setSending(false); return notify("You haven’t changed anything yet.", "error"); }
      const { error } = await supabase().rpc("submit_revision", { listing: initial.id, changes });
      setSending(false);
      if (error) return notify(explain(error), "error");
      notify("Changes sent for review. The live listing stays as it is until they are approved.");
    }
    onDone(true);
  }

  const gaps = listingGaps(p);
  const saveLine = mode === "revision" ? "Changes are sent together for review" : save === "saving" ? "Saving…" : save === "saved" ? "Draft saved" : save === "error" ? "Not saved" : "Saves automatically";

  return (
    <div className="sel-wizard">
      <div className="adm-form-head">
        <Button type="button" onClick={finishLater} variant="ghost" icon={<ArrowLeft size={16} />} label={mode === "draft" ? "Save and finish later" : "Back to my listings"} />
        <div className="adm-section-head">
          <VStack gap={1}>
            <Heading level={1}>{mode === "revision" ? `Edit ${initial.reference}` : isNew ? "List a property" : initial.reference ? `Listing ${initial.reference}` : "Your listing"}</Heading>
            <Text type="supporting" as="p">{mode === "revision" ? "Your listing stays live as it is. Changes go live once our team approves them." : "Every listing is checked by our team before buyers see it."}</Text>
          </VStack>
          <span className="sel-save" role="status" data-state={save}>{saveLine}</span>
        </div>
      </div>

      {initial.review_note && initial.stage === "changes_requested" && (
        <div className="sel-note"><Banner status="warning" title="Changes requested by our reviewer" description={initial.review_note} /></div>
      )}

      <Card padding={5} className="sel-steps">
        <Stepper activeStep={step} label="Listing steps" onStepClick={(i) => void goTo(i)} density="compact">
          {STEPS.map((s, i) => <Step key={s.label} step={i} label={s.label} description={s.description} />)}
        </Stepper>
      </Card>

      <div className="adm-form sel-form">
        {step === 0 && (
          <fieldset id="sec-listing"><legend>The property</legend>
            <CategorySelects {...fields} />
            <TextField label="Title" value={p.title} onChange={(v) => set("title", v ?? "")} required wide placeholder="e.g. East-facing corner plot in Porur"
              hint="What it is and where, in a few words. Buyers see this first." />
          </fieldset>
        )}

        {step === 1 && <LocationSection {...fields} />}

        {step === 2 && (
          <>
            <PriceSizeSection {...fields} />
            <TypeDetailsSection {...fields} />
            <LegalSection {...fields} descriptionHint="At least 50 characters. Describe the property, access and anything a buyer should know. No phone numbers, and no promises of returns." />
            <AmenitiesSection {...fields} />
            <fieldset id="sec-nearby"><legend>Nearby</legend><NearbyRows {...fields} /></fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <fieldset id="sec-photos"><legend>Photos</legend>
              <Photos images={p.images} onChange={setImages} folder={`sellers/${profile.user_id}`} onUploaded={() => {}} hint="Add at least 3: the front, the road and the inside or the land." />
            </fieldset>
            <fieldset id="sec-documents"><legend>Documents (private)</legend>
              {mode === "draft"
                ? <Documents propertyId={initial.id!} sellerId={profile.user_id} ensureSaved={persist} notify={notify} />
                : <Text color="secondary" as="p">Documents can be added while a listing is a draft. To add documents to a live listing, contact us and we’ll attach them for you.</Text>}
            </fieldset>
          </>
        )}

        {step === 4 && (
          <fieldset id="sec-review"><legend>Review &amp; send</legend>
            <div className="adm-wide">
              <Summary p={p} />
            </div>
            <div className="adm-wide">
              {gaps.length > 0
                ? <Banner status="warning" title="Before you send it" description={`Still needed: ${gaps.join(", ")}.`} />
                : <Banner status="success" title="Ready to send" description={mode === "revision" ? "We’ll review the changes and update the live listing." : "We’ll check the details and documents, and contact you if anything needs changing."} />}
            </div>
            <div className="adm-wide">
              <CheckboxInput value={declared} onChange={setDeclared}
                label={profile.seller_type === "owner" ? "I own this property, and the details are true to the best of my knowledge." : "I am authorised to sell this property, and the details are true to the best of my knowledge."}
                description="Listings with wrong details are taken down." />
            </div>
          </fieldset>
        )}

        <div className="sel-nav">
          {step > 0 ? <Button type="button" onClick={() => void goTo(step - 1)} icon={<ArrowLeft size={16} />} label="Back" /> : <span />}
          {step < STEPS.length - 1
            ? <Button type="button" variant="primary" onClick={() => void goTo(step + 1)} endContent={<ArrowRight size={16} />} label={`Next: ${STEPS[step + 1].label}`} />
            : <Button type="button" variant="primary" isDisabled={!declared || gaps.length > 0 || sending} isLoading={sending} onClick={() => void send()} icon={<Send size={16} />}
                label={mode === "revision" ? "Send changes for review" : "Send for review"} />}
        </div>
      </div>
    </div>
  );
}

/** Key facts, as the reviewer will see them. */
function Summary({ p }: { p: PropertyRow }) {
  const facts: [string, string][] = [
    ["Type", `${categoryLabel(p.category)} · ${p.property_type}`],
    ["Title", p.title || "—"],
    ["Location", [p.location, p.locality].filter(Boolean).join(", ") || "—"],
    ["Price", p.price ? `${formatINR(p.price)}${p.price_negotiable ? " (negotiable)" : ""}` : "On request"],
    ["Area", p.area_sqft ? areaIn(p.area_sqft, p.area_unit) : "—"],
    ["Photos", String(p.images.length)],
  ];
  return (
    <dl className="sel-summary">
      {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

/** Private documents: uploaded to a bucket only the seller and reviewers can read. */
function Documents({ propertyId, sellerId, ensureSaved, notify }: { propertyId: string; sellerId: string; ensureSaved: () => Promise<boolean>; notify: Notify }) {
  const [docs, setDocs] = useState<SellerDocument[] | null>(null);
  const [label, setLabel] = useState(DOC_LABELS[0]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void supabase().from("seller_documents").select("*").eq("property_id", propertyId).order("created_at").then(({ data }) => setDocs((data ?? []) as SellerDocument[]));
  }, [propertyId]);

  async function add(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      if (!(await ensureSaved())) return; // the document row needs the listing to exist
      const path = await uploadDocument(file, sellerId, propertyId);
      const row = { id: crypto.randomUUID(), property_id: propertyId, seller_id: sellerId, label, path, file_name: file.name.slice(0, 200), size_bytes: file.size };
      const { error } = await supabase().from("seller_documents").insert(row);
      if (error) { await deleteDocuments([path]); throw new Error(explain(error)); }
      setDocs((d) => [...(d ?? []), { ...row, created_at: new Date().toISOString() }]);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(doc: SellerDocument) {
    const { error } = await supabase().from("seller_documents").delete().eq("id", doc.id);
    if (error) return notify(explain(error), "error");
    await deleteDocuments([doc.path]);
    setDocs((d) => d?.filter((x) => x.id !== doc.id) ?? null);
  }

  async function open(doc: SellerDocument) {
    try { await openDocument(doc.path); } catch (e) { notify(e instanceof Error ? e.message : "Couldn’t open it.", "error"); }
  }

  return (
    <VStack gap={4} className="adm-wide">
      <Text color="secondary" as="p">Patta, chitta, EC, sale deed, approvals: anything that shows the property is yours to sell. Only our reviewers can open these; buyers never see them. PDF or photo, up to 10 MB each.</Text>
      {docs && docs.length > 0 && (
        <ul className="sel-docs" aria-label="Uploaded documents">
          {docs.map((d) => (
            <li key={d.id}>
              <FileText size={18} aria-hidden="true" />
              <VStack gap={0}><Text weight="semibold">{d.label}</Text><Text type="supporting">{d.file_name}</Text></VStack>
              <HStack gap={1}>
                <Button size="sm" variant="ghost" label="Open" onClick={() => void open(d)} />
                <IconButton size="sm" variant="ghost" label={`Remove ${d.label}`} icon={<Trash2 size={16} />} onClick={() => void remove(d)} />
              </HStack>
            </li>
          ))}
        </ul>
      )}
      <div className="sel-doc-add">
        <Selector label="Document" value={label} options={DOC_LABELS} onChange={setLabel} />
        <Button type="button" icon={<Upload size={16} />} isLoading={busy} isDisabled={busy} label={busy ? "Uploading…" : "Upload document"} onClick={() => input.current?.click()} />
        <input ref={input} type="file" accept={DOCUMENT_TYPES} hidden onChange={(e) => void add(e.target.files)} aria-label="Document file" />
      </div>
    </VStack>
  );
}
