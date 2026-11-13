"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

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

export default function Catalog({ label, tabs, search, filters = [], sorts = [], notes = [], pageSize = 6, total, children }: {
  label: string;
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
  const id = useId();
  const grid = useRef<HTMLUListElement>(null);
  const drawer = useRef<HTMLDetailsElement>(null);
  // Filters start folded away on phones (a drawer), open on wider screens.
  useEffect(() => {
    if (drawer.current && matchMedia("(max-width: 40rem)").matches) drawer.current.open = false;
  }, []);
  const defaults = useCallback((): State => ({
    tab: ALL, q: "", sort: sorts[0]?.value ?? "order", page: 0,
    values: Object.fromEntries(filters.map((f) => [f.name, ALL])),
  }), [filters, sorts]);
  const [state, setState] = useState<State>(defaults);
  const [count, setCount] = useState(total);
  const [tabTotal, setTabTotal] = useState(total);
  const [ready, setReady] = useState(false);

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
  const hasControls = Boolean(tabs || search || filters.length || sorts.length > 1);

  return (
    <div className="catalog">
      {tabs && (
        <div className="catalog-tabs" role="group" aria-label={tabs.label}>
          {[{ value: ALL, label: tabs.allLabel }, ...tabs.options].map((o) => (
            <button key={o.value} type="button" aria-pressed={state.tab === o.value} onClick={() => update({ tab: o.value })}>{o.label}</button>
          ))}
        </div>
      )}
      {hasControls && (
        <details className="catalog-drawer" open ref={drawer}>
          <summary>Filters{chips.length > 0 && ` (${chips.length})`}</summary>
          <div className="catalog-controls" role="search" aria-label={`Filter ${label}`}>
            {search && (
              <div className="field field--search">
                <label htmlFor={`${id}-q`}>Search</label>
                <input id={`${id}-q`} type="search" value={state.q} placeholder={search} maxLength={80}
                  onChange={(e) => update({ q: e.target.value }, "replace")} />
              </div>
            )}
            {visibleFilters.map((f) => (
              <div className="field" key={f.name}>
                <label htmlFor={`${id}-${f.name}`}>{f.label}</label>
                <select id={`${id}-${f.name}`} value={state.values[f.name] ?? ALL} onChange={(e) => update({ values: { [f.name]: e.target.value } })}>
                  <option value={ALL}>Any</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            {sorts.length > 1 && (
              <div className="field">
                <label htmlFor={`${id}-sort`}>Sort by</label>
                <select id={`${id}-sort`} value={state.sort} onChange={(e) => update({ sort: e.target.value })}>
                  {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <button type="button" className="btn btn--small catalog-apply" onClick={(e) => { (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }}>
            Show {count} {count === 1 ? "result" : "results"}
          </button>
        </details>
      )}
      <div className="catalog-summary">
        <p className="result-count" role="status">{count === total ? `${total} listed` : `${count} of ${total} shown`}</p>
        {chips.length > 0 && (
          <ul className="chips" aria-label="Applied filters">
            {chips.map((c) => <li key={c.key}><button type="button" onClick={c.clear} aria-label={`Remove ${c.text}`}>{c.text}<span aria-hidden="true"> ×</span></button></li>)}
            <li><button type="button" className="link" onClick={clearAll}>Clear all</button></li>
          </ul>
        )}
      </div>
      {note && <p className="catalog-note">{note}</p>}
      <ul className="card-grid" ref={grid} aria-label={label}>{children}</ul>
      {count === 0 && tabTotal === 0 && tabs && (
        <p className="empty-state">
          No {tabs.options.find((o) => o.value === state.tab)?.label.toLowerCase()} are listed right now. New listings are added as they are verified, so please check again later,
          or <a className="link" href="/contact">tell us what you are looking for</a> and we will call you when one fits.
        </p>
      )}
      {count === 0 && tabTotal > 0 && (
        <p className="empty-state">
          Nothing matches these choices. {chips.length > 0 && <><button type="button" className="link" onClick={clearAll}>Clear the filters</button> or </>}
          <a className="link" href="/contact">tell us what you need</a>.
        </p>
      )}
      {ready && pages > 1 && (
        <nav className="pager" aria-label={`${label} pages`}>
          <button type="button" className="btn btn--quiet btn--small" disabled={state.page === 0} onClick={() => goTo(state.page - 1)}>Previous</button>
          <p aria-live="polite">Showing {first} to {last} of {count}</p>
          <button type="button" className="btn btn--quiet btn--small" disabled={state.page >= pages - 1} onClick={() => goTo(state.page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}
