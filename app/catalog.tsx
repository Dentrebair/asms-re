"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Drawer } from "@astryxdesign/core/Drawer";
import { Card } from "@astryxdesign/core/Card";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ArrowUpDown, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Selector } from "@astryxdesign/core/Selector";
import { Token } from "@astryxdesign/core/Token";
import { Button } from "@astryxdesign/core/Button";
import { Pagination } from "@astryxdesign/core/Pagination";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";

/**
 * The shared listing framework for properties and products: tabs, a keyword
 * search, filters and sorting above a three-column grid shown six at a time
 * (3 × 2), with a pager below. Cards are rendered on the server as <li>
 * children carrying data-* attributes; this component only shows, hides and
 * orders them. Every choice is kept in the URL (?type=plot&budget=…), so
 * results can be shared and the browser Back button steps through them.
 * Without script the controls stay hidden and every card shows.
 */
export type CatalogOption = { value: string; label: string };

export type CatalogTabs = {
  /** URL parameter, e.g. "type" */
  name: string;
  /** data attribute on each <li> (without "data-") */
  attr: string;
  label: string;
  allLabel: string;
  options: CatalogOption[];
};

export type CatalogFilter = {
  name: string;
  label: string;
  attr: string;
  /** "equals" matches the value; "range" matches "lo-hi" numbers; "min" matches numbers at or above it; "empty" matches a missing attribute. */
  kind: "equals" | "range" | "min";
  options: CatalogOption[];
  /** Show only on these tabs (all tabs when omitted). */
  tabs?: string[];
};

export type CatalogSort = { value: string; label: string; attr?: string; kind: "order" | "number" | "date" | "text"; dir?: 1 | -1 };

export type CatalogNote = { value: string; text: string };

type State = { tab: string; q: string; sort: string; page: number; values: Record<string, string> };

const ALL = "all";

export default function Catalog({ label, itemName = ["result", "results"], tabs, search, filters = [], sorts = [], notes = [], pageSize = 9, total, children }: {
  label: string;
  /** Singular and plural for the result count, e.g. ["property", "properties"]. */
  itemName?: [string, string];
  tabs?: CatalogTabs;
  /** Placeholder for the keyword box; items are matched on their data-search text. */
  search?: string;
  filters?: CatalogFilter[];
  sorts?: CatalogSort[];
  /** A line shown under the controls for the selected tab (a category's intro). */
  notes?: CatalogNote[];
  pageSize?: number;
  total: number;
  children: ReactNode;
}) {
  const grid = useRef<HTMLUListElement>(null);
  const defaults = useCallback((): State => ({
    tab: ALL, q: "", sort: sorts[0]?.value ?? "order", page: 0,
    values: Object.fromEntries(filters.map((f) => [f.name, ALL])),
  }), [filters, sorts]);
  const [state, setState] = useState<State>(defaults);
  const [count, setCount] = useState(total);
  const [tabTotal, setTabTotal] = useState(total);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const noun = (n: number) => (n === 1 ? itemName[0] : itemName[1]);

  const visibleFilters = filters.filter((f) => !f.tabs || f.tabs.includes(state.tab));

  // ---- URL ⇄ state
  const fromUrl = useCallback((): State => {
    const params = new URLSearchParams(window.location.search);
    const next = defaults();
    const hash = decodeURIComponent(window.location.hash.slice(1)); // older links: /products#roofing
    const tab = params.get(tabs?.name ?? "") ?? (tabs?.options.some((o) => o.value === hash) ? hash : null);
    if (tabs && tab && tabs.options.some((o) => o.value === tab)) next.tab = tab;
    next.q = (params.get("q") ?? "").slice(0, 80);
    const sort = params.get("sort");
    if (sort && sorts.some((s) => s.value === sort)) next.sort = sort;
    for (const f of filters) {
      const v = params.get(f.name);
      if (v && (v === "empty" || f.options.some((o) => o.value === v)) && (!f.tabs || f.tabs.includes(next.tab))) next.values[f.name] = v;
    }
    next.page = Math.max(0, Number(params.get("page") ?? 1) - 1) || 0;
    return next;
  }, [defaults, filters, sorts, tabs]);

  const toUrl = (s: State, mode: "push" | "replace") => {
    const params = new URLSearchParams();
    if (tabs && s.tab !== ALL) params.set(tabs.name, s.tab);
    if (s.q.trim()) params.set("q", s.q.trim());
    for (const f of filters) if (s.values[f.name] !== ALL) params.set(f.name, s.values[f.name]);
    if (s.sort !== (sorts[0]?.value ?? "order")) params.set("sort", s.sort);
    if (s.page > 0) params.set("page", String(s.page + 1));
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (url === `${window.location.pathname}${window.location.search}`) return;
    history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
  };

  useEffect(() => {
    const restore = () => setState(fromUrl());
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => { window.removeEventListener("popstate", restore); window.removeEventListener("hashchange", restore); };
  }, [fromUrl]);

  const update = (change: Partial<State>, mode: "push" | "replace" = "push") => {
    setState((cur) => {
      const next = { ...cur, ...change, values: { ...cur.values, ...change.values }, page: change.page ?? 0 };
      // Filters that belong to another tab are cleared when the tab changes.
      if (change.tab !== undefined) for (const f of filters) if (f.tabs && !f.tabs.includes(next.tab)) next.values[f.name] = ALL;
      toUrl(next, mode);
      return next;
    });
  };

  // ---- apply to the cards
  useEffect(() => {
    const ul = grid.current;
    if (!ul) return;
    const items = [...ul.querySelectorAll<HTMLLIElement>(":scope > li")];
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const num = (v: string) => Number(v);
    const matches = (li: HTMLLIElement) => {
      if (tabs && state.tab !== ALL && li.dataset[tabs.attr] !== state.tab) return false;
      if (words.length && !words.every((w) => (li.dataset.search ?? "").includes(w))) return false;
      return filters.every((f) => {
        const want = state.values[f.name] ?? ALL;
        const have = li.dataset[f.attr] ?? "";
        if (want === ALL) return true;
        if (want === "empty") return have === "";
        if (have === "") return false; // a price filter hides "price on request" items
        if (f.kind === "min") return num(have) >= num(want);
        if (f.kind === "range") {
          const [lo, hi] = want.split("-");
          return num(have) >= Number(lo || 0) && (!hi || num(have) < Number(hi));
        }
        return have === want;
      });
    };
    const s = sorts.find((x) => x.value === state.sort);
    const key = (li: HTMLLIElement): number | string => {
      const raw = s?.attr ? li.dataset[s.attr] ?? "" : "";
      if (!s || s.kind === "order") return Number(li.dataset.order);
      if (s.kind === "number") return raw === "" ? Infinity : Number(raw) * (s.dir ?? 1);
      if (s.kind === "date") return -(Date.parse(raw || "1970-01-01")) * (s.dir ?? 1);
      return raw.toLowerCase();
    };
    if (tabs) setCounts(Object.fromEntries(tabs.options.map((o) => [o.value, items.filter((li) => li.dataset[tabs.attr] === o.value).length])));
    setTabTotal(tabs && state.tab !== ALL ? items.filter((li) => li.dataset[tabs.attr] === state.tab).length : items.length);
    const shown = items.filter(matches).sort((a, b) => {
      const ka = key(a), kb = key(b);
      const d = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb));
      return d || Number(a.dataset.order) - Number(b.dataset.order); // stable order for ties
    });
    const pages = Math.max(1, Math.ceil(shown.length / pageSize));
    const current = Math.min(state.page, pages - 1);
    items.forEach((li) => { li.hidden = true; });
    shown.forEach((li, i) => {
      ul.appendChild(li);
      li.hidden = i < current * pageSize || i >= (current + 1) * pageSize;
    });
    setCount(shown.length);
    if (current !== state.page) setState((cur) => ({ ...cur, page: current }));
    setReady(true);
  }, [state, pageSize, filters, sorts, tabs]);

  const pages = Math.max(1, Math.ceil(count / pageSize));
  const first = count === 0 ? 0 : state.page * pageSize + 1;
  const last = Math.min(count, (state.page + 1) * pageSize);
  const note = notes.find((n) => n.value === state.tab)?.text;
  const goTo = (p: number) => {
    update({ page: p });
    grid.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Applied filters as removable chips.
  const chips = [
    ...(state.q.trim() ? [{ key: "q", text: `“${state.q.trim()}”`, clear: () => update({ q: "" }) }] : []),
    ...visibleFilters.filter((f) => state.values[f.name] !== ALL).map((f) => ({
      key: f.name,
      text: `${f.label}: ${f.options.find((o) => o.value === state.values[f.name])?.label ?? state.values[f.name]}`,
      clear: () => update({ values: { [f.name]: ALL } }),
    })),
  ];
  const clearAll = () => update({ q: "", values: Object.fromEntries(filters.map((f) => [f.name, ALL])) });
  const emptyType = tabs?.options.find((o) => o.value === state.tab)?.label.toLowerCase();
  const tabCount = (value: string) => (value === ALL ? total : counts[value] ?? 0);

  // One filter panel, shown as a sticky sidebar on wide screens and in a drawer on phones.
  const panel = (where: "side" | "drawer") => (
    <VStack gap={5}>
      {tabs && (
        <RadioList label={tabs.label} value={state.tab} onChange={(v) => update({ tab: v })} htmlName={`${where}-${tabs.name}`}>
          {[{ value: ALL, label: tabs.allLabel }, ...tabs.options].map((o) => (
            <RadioListItem key={o.value} value={o.value} label={`${o.label} (${tabCount(o.value)})`} />
          ))}
        </RadioList>
      )}
      {search && (
        <TextInput label="Search" type="search" startIcon={Search} value={state.q} placeholder={search} hasClear
          onChange={(v) => update({ q: v.slice(0, 80) }, "replace")} />
      )}
      {visibleFilters.map((f) => (
        <Selector key={f.name} label={f.label} value={state.values[f.name] ?? ALL}
          options={[{ value: ALL, label: "Any" }, ...f.options]}
          onChange={(v) => update({ values: { [f.name]: v } })} />
      ))}
      {chips.length > 0 && <div><Button label="Clear all filters" variant="ghost" size="sm" onClick={clearAll} /></div>}
    </VStack>
  );

  return (
    <div className="catalog" data-layout="portal">
      <aside className="catalog-side" role="search" aria-label={`Filter ${label}`}>
        <Card padding={5}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center"><SlidersHorizontal size={18} aria-hidden="true" /><Heading level={3}>Filters</Heading></HStack>
            {panel("side")}
          </VStack>
        </Card>
      </aside>

      <div className="catalog-main">
        <VStack gap={4}>
          <div className="results-bar">
            <VStack gap={1}>
              <Heading level={2} role="status" className="result-count">
                {count === total ? `${total} ${noun(total)}` : `${count} of ${total} ${noun(total)}`}
              </Heading>
              {note && <Text color="secondary" as="p" className="catalog-note">{note}</Text>}
            </VStack>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <span className="filters-toggle">
                <Button label={`Filters${chips.length ? ` (${chips.length})` : ""}`} icon={<SlidersHorizontal size={16} />} onClick={() => setDrawer(true)} />
              </span>
              {sorts.length > 1 && (
                <Selector label="Sort by" isLabelHidden size="sm" startIcon={ArrowUpDown} value={state.sort}
                  options={sorts.map((x) => ({ value: x.value, label: x.label }))} onChange={(v) => update({ sort: v })} />
              )}
              <SegmentedControl label="View" value={view} onChange={(v) => setView(v as "grid" | "list")} size="sm">
                <SegmentedControlItem value="grid" label="Grid" icon={<LayoutGrid size={16} />} />
                <SegmentedControlItem value="list" label="List" icon={<List size={16} />} />
              </SegmentedControl>
            </HStack>
          </div>

          {chips.length > 0 && (
            <HStack gap={2} wrap="wrap" aria-label="Applied filters">
              {chips.map((c) => <Token key={c.key} label={c.text} onRemove={c.clear} />)}
              <Button label="Clear all" variant="ghost" size="sm" onClick={clearAll} />
            </HStack>
          )}

          <ul className="card-grid" data-view={view} ref={grid} aria-label={label}>{children}</ul>

          {count === 0 && tabTotal === 0 && tabs && (
            <EmptyState title={`No ${emptyType} listed right now`}
              description="New listings are added as they are verified, so please check again later, or tell us what you are looking for and we will call you when one fits."
              actions={<Button href="/contact" label="Tell us what you need" variant="primary" />} />
          )}
          {count === 0 && tabTotal > 0 && (
            <EmptyState title="Nothing matches these choices" description="Try fewer filters, or tell us what you need."
              actions={<HStack gap={2}>{chips.length > 0 && <Button label="Clear the filters" onClick={clearAll} />}<Button href="/contact" label="Tell us what you need" variant="primary" /></HStack>} />
          )}
          {ready && pages > 1 && (
            <VStack gap={2} hAlign="center">
              <Pagination page={state.page + 1} totalPages={pages} onChange={(p) => goTo(p - 1)} label={`${label} pages`} />
              <Text type="supporting" aria-live="polite">Showing {first} to {last} of {count}</Text>
            </VStack>
          )}
        </VStack>
      </div>

      <Drawer isOpen={drawer} onOpenChange={setDrawer} label={`Filter ${label}`} side="start" width={340}>
        <VStack gap={5} padding={1}>
          <Heading level={2}>Filters</Heading>
          {panel("drawer")}
          <Button label={`Show ${count} ${count === 1 ? "result" : "results"}`} variant="primary" width="100%" onClick={() => setDrawer(false)} />
        </VStack>
      </Drawer>
    </div>
  );
}
