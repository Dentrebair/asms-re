"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Heading, Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { Search } from "lucide-react";
import { SELLER_TYPES, explain, supabase, type AuditRow, type PropertyRow, type SellerProfile } from "./lib";
import { formatDate, formatWhen, historyLine } from "./stages";
import { SectionHeader, StatCards } from "./ui";

type Notify = (message: string, tone?: "ok" | "error") => void;
type Listing = Pick<PropertyRow, "id" | "reference" | "title" | "stage" | "seller_id">;

/** Everyone who has signed up to sell, what they have listed, and the audit log. */
export function SellersAdmin({ notify }: { notify: Notify }) {
  const [sellers, setSellers] = useState<SellerProfile[] | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [log, setLog] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "active" | "suspended">("all");

  const load = useCallback(async () => {
    const [s, p, a] = await Promise.all([
      supabase().from("seller_profiles").select("*").order("created_at", { ascending: false }),
      supabase().from("properties").select("id,reference,title,stage,seller_id"),
      supabase().from("audit_log").select("*").order("at", { ascending: false }).limit(100),
    ]);
    const error = s.error ?? p.error ?? a.error;
    if (error) notify(explain(error), "error");
    setSellers((s.data ?? []) as SellerProfile[]);
    setListings((p.data ?? []) as Listing[]);
    setLog((a.data ?? []) as AuditRow[]);
  }, [notify]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on open
  useEffect(() => { void load(); }, [load]);

  async function setStatus(s: SellerProfile, status: SellerProfile["status"]) {
    if (status === "suspended" && !confirm(`Suspend ${s.name}? They keep their live listings but can’t add, change or send listings until you reactivate them.`)) return;
    const { error } = await supabase().from("seller_profiles").update({ status }).eq("user_id", s.user_id);
    if (error) return notify(explain(error), "error");
    notify(status === "suspended" ? `${s.name} is suspended.` : `${s.name} is active again.`);
    void load();
  }

  const all = sellers ?? [];
  const q = query.trim().toLowerCase();
  const visible = all.filter((s) => (view === "all" || s.status === view) && (!q || [s.name, s.email, s.phone, s.company].some((v) => v?.toLowerCase().includes(q))));
  const countFor = (id: string) => listings.filter((l) => l.seller_id === id);
  const stat = (label: string, v: typeof view, n: number, tone?: "warning" | "success") => ({ label, value: sellers ? n : "…", tone, isActive: view === v, onClick: () => setView(v) });
  const ref = (id: string | null) => listings.find((l) => l.id === id);
  const sellerName = (id: string | null) => all.find((s) => s.user_id === id)?.name;

  const columns: TableColumn<Row>[] = [
    { key: "name", header: "Seller", width: proportional(2, { minWidth: 180 }), renderCell: (s) => (
      <VStack gap={0}><Text weight="semibold" maxLines={1}>{s.name}</Text><Text type="supporting" maxLines={1}>{SELLER_TYPES.find((t) => t.value === s.seller_type)?.label}{s.company ? ` · ${s.company}` : ""}</Text></VStack>
    ) },
    { key: "contact", header: "Contact", width: proportional(2, { minWidth: 180 }), renderCell: (s) => (
      <VStack gap={0}><a className="adm-contact" href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`}>{s.phone}</a><Text type="supporting" maxLines={1}>{s.email}</Text></VStack>
    ) },
    { key: "listings", header: "Listings", width: proportional(1, { minWidth: 100 }), renderCell: (s) => {
      const mine = countFor(s.user_id);
      return <Text hasTabularNumbers>{mine.filter((l) => l.stage === "live").length} live / {mine.length}</Text>;
    } },
    { key: "joined", header: "Joined", width: proportional(1, { minWidth: 100 }), renderCell: (s) => <Text type="supporting">{formatDate(s.created_at)}</Text> },
    { key: "status", header: "Status", width: proportional(1, { minWidth: 100 }), renderCell: (s) => <Badge label={s.status === "active" ? "Active" : "Suspended"} variant={s.status === "active" ? "success" : "error"} /> },
    { key: "actions", header: "", width: pixel(130), align: "end", renderCell: (s) => s.status === "active"
      ? <Button size="sm" label="Suspend" onClick={() => void setStatus(s, "suspended")} />
      : <Button size="sm" variant="primary" label="Reactivate" onClick={() => void setStatus(s, "active")} /> },
  ];

  return (
    <section>
      <SectionHeader title="Sellers" count={sellers ? all.length : null} description="Owners, brokers and developers who list through the seller portal. Suspending stops new listings and changes." />
      <StatCards items={[stat("All sellers", "all", all.length), stat("Active", "active", all.filter((s) => s.status === "active").length, "success"), stat("Suspended", "suspended", all.filter((s) => s.status === "suspended").length, "warning")]} />
      <div className="adm-filters">
        <TextInput type="search" label="Search sellers" isLabelHidden placeholder="Search name, email, phone, company" value={query} onChange={setQuery} hasClear startIcon={Search} />
      </div>
      {sellers === null ? <p className="adm-muted">Loading…</p> : visible.length === 0 ? (
        <div className="adm-empty"><EmptyState isCompact title={all.length === 0 ? "No sellers yet" : "No sellers match"} description={all.length === 0 ? "Sellers appear here after they sign in at /seller." : "Try another search."} /></div>
      ) : (
        <Card padding={0} className="adm-table">
          <Table<Row> data={visible.map((s) => ({ ...s, id: s.user_id })) as Row[]} columns={columns} idKey="id" hasHover density="balanced" />
        </Card>
      )}

      <div className="adm-group">
        <Heading level={2}>Activity</Heading>
        <Text type="supporting" as="p">The latest 100 changes to seller listings and accounts: submissions, review decisions, publishing and suspensions.</Text>
        {log.length === 0 ? <div className="adm-empty"><EmptyState isCompact title="No activity yet" /></div> : (
          <Card padding={0}>
            <ol className="adm-activity">
              {log.map((a) => {
                const l = ref(a.property_id);
                return (
                  <li key={a.id}>
                    <Text type="supporting" hasTabularNumbers>{formatWhen(a.at)}</Text>
                    <VStack gap={0}>
                      <Text><strong>{historyLine(a)}</strong>{l ? ` · ${l.reference} ${l.title}` : a.seller_id ? ` · ${sellerName(a.seller_id) ?? "seller"}` : ""}</Text>
                      {a.note && <Text color="secondary" as="p">“{a.note}”</Text>}
                    </VStack>
                    <Text type="supporting" maxLines={1}>{a.actor ?? "system"}</Text>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </div>
    </section>
  );
}

type Row = SellerProfile & { id: string } & Record<string, unknown>;
