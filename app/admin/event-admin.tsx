"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Download, RefreshCw, Search } from "lucide-react";
import { EVENT } from "@/lib/event";
import { explain, supabase } from "./lib";
import { SectionHeader, StatCards } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
type Registration = { id: string; code: string; name: string; company: string | null; whatsapp: string; source: "popup" | "page" | "qr"; created_at: string };
type Funnel = { views: number; qr_scans: number; form_starts: number; registrations: number };

const SOURCE: Record<Registration["source"], string> = { qr: "QR code", page: "Event page", popup: "Website popup" };
const ist = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
// A byte-order mark so Excel opens the CSV as UTF-8 (names with ₹ or Tamil letters).
const BOM = String.fromCharCode(0xfeff);
const phone = (w: string) => `+91 ${w.slice(2, 7)} ${w.slice(7)}`;

/** Registrations for the 21 Nov event offer, the funnel, the QR code and a CSV export. */
export function EventAdmin({ notify }: { notify: Notify }) {
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const [regs, stats] = await Promise.all([
      supabase().from("event_registrations").select("id,code,name,company,whatsapp,source,created_at").eq("event_slug", EVENT.slug).order("created_at", { ascending: false }),
      supabase().rpc("event_funnel", { event: EVENT.slug }),
    ]);
    if (regs.error) return notify(explain(regs.error), "error");
    setRows(regs.data as Registration[]);
    if (!stats.error && Array.isArray(stats.data) && stats.data[0]) setFunnel(stats.data[0] as Funnel);
  }, [notify]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, [load]);

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter((r) => !q || [r.code, r.name, r.company ?? "", r.whatsapp].some((v) => v.toLowerCase().includes(q)));

  function exportCsv() {
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [["Registration ID", "Name", "Company", "WhatsApp", "Source", "Registered (IST)"].join(","),
      ...(rows ?? []).map((r) => [r.code, r.name, r.company ?? "", phone(r.whatsapp), SOURCE[r.source], ist(r.created_at)].map(cell).join(","))];
    const url = URL.createObjectURL(new Blob([`${BOM}${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `event-registrations-${EVENT.slug}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
  const columns: TableColumn<Registration>[] = [
    { key: "code", header: "ID", width: pixel(130), renderCell: (r) => <Text weight="semibold" hasTabularNumbers>{r.code}</Text> },
    { key: "name", header: "Name", width: proportional(2, { minWidth: 160 }), renderCell: (r) => (
      <VStack gap={0}><Text weight="semibold" maxLines={1}>{r.name}</Text><Text type="supporting" maxLines={1}>{r.company ?? "No company given"}</Text></VStack>
    ) },
    { key: "whatsapp", header: "WhatsApp", width: proportional(1, { minWidth: 150 }), renderCell: (r) => <a className="adm-contact" href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noopener noreferrer">{phone(r.whatsapp)}</a> },
    { key: "source", header: "Source", width: proportional(1, { minWidth: 110 }), renderCell: (r) => <Text type="supporting">{SOURCE[r.source]}</Text> },
    { key: "created_at", header: "Registered (IST)", width: proportional(1, { minWidth: 130 }), renderCell: (r) => <Text type="supporting" hasTabularNumbers>{ist(r.created_at)}</Text> },
  ];

  return (
    <section>
      <SectionHeader title="Event offer" count={rows ? rows.length : null} description="Open until 21 Nov 2026, 11:59 PM IST · 25% off brokerage. Registrations from the website popup, the event page and the QR code.">
        <HStack gap={2}>
          <Button label="Refresh" icon={<RefreshCw size={16} />} onClick={() => void load()} />
          <Button label="Export CSV" icon={<Download size={16} />} isDisabled={!rows?.length} onClick={exportCsv} />
        </HStack>
      </SectionHeader>
      <StatCards items={[
        { label: "Saw the offer", value: funnel ? funnel.views : "…" },
        { label: "QR scans", value: funnel ? funnel.qr_scans : "…" },
        { label: "Started the form", value: funnel ? funnel.form_starts : "…" },
        { label: `Registered (${funnel ? pct(funnel.registrations, funnel.views) : "…"} of viewers)`, value: funnel ? funnel.registrations : "…", tone: "success" },
      ]} />
      <div className="adm-filters">
        <TextInput type="search" label="Search registrations" isLabelHidden placeholder="Search ID, name, company, number" value={query} onChange={setQuery} hasClear startIcon={Search} />
      </div>
      {rows === null ? <p className="adm-muted">Loading…</p> : visible.length === 0 ? (
        <div className="adm-empty"><EmptyState isCompact title={rows.length === 0 ? "No registrations yet" : "No registrations match"} description={rows.length === 0 ? "They appear here as people register, until 21 Nov, 11:59 PM IST." : "Try another search."} /></div>
      ) : (
        <Card padding={0} className="adm-table"><Table<Registration> data={visible} columns={columns} idKey="id" hasHover density="balanced" /></Card>
      )}
      <div className="adm-group">
        <Heading level={2}>QR code for the event</Heading>
        <Text type="supporting" as="p">Print it on the standee and brochures. It opens <strong>{EVENT.qrUrl}</strong>, and every scan is counted above.</Text>
        <HStack gap={4} vAlign="center" wrap="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser */}
          <img src="/event/event-offer-qr.png" alt="QR code linking to the event offer registration page" width={160} height={160} />
          <VStack gap={2}>
            <Button href="/event/event-offer-qr.png" label="Download PNG (for print)" icon={<Download size={16} />} />
            <Button href="/event/event-offer-qr.svg" label="Download SVG (any size)" icon={<Download size={16} />} variant="ghost" />
          </VStack>
        </HStack>
      </div>
    </section>
  );
}
