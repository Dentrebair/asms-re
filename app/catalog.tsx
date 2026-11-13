"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * The shared listing framework for properties and products: optional filters
 * and sorting above a three-column grid shown six at a time (3 × 2), with a
 * pager below. The cards are rendered on the server as <li> children carrying
 * data-* attributes; this component only shows, hides and orders them.
 * Without script the controls stay hidden and every card shows.
 */
export type CatalogFilter = {
  name: string;
  label: string;
  /** data attribute on each <li> (without "data-") */
  attr: string;
  /** "equals" matches the value; "range" matches "lo-hi" numbers; the value "empty" matches a missing attribute. */
  kind: "equals" | "range";
  options: { value: string; label: string }[];
  /** Read the initial value from the URL hash (e.g. /products#roofing). */
  fromHash?: boolean;
};

export type CatalogSort = { value: string; label: string; attr?: string; kind: "order" | "number" | "date" | "text"; dir?: 1 | -1 };

export type CatalogNote = { value: string; text: string };

export default function Catalog({ label, filters = [], sorts = [], notes = [], noteFilter, pageSize = 6, total, children }: {
  label: string;
  filters?: CatalogFilter[];
  sorts?: CatalogSort[];
  /** A line shown under the controls when a filter has this value (a category's intro). */
  notes?: CatalogNote[];
  noteFilter?: string;
  pageSize?: number;
  total: number;
  children: ReactNode;
}) {
  const id = useId();
  const grid = useRef<HTMLUListElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(filters.map((f) => [f.name, "all"])));
  const [sort, setSort] = useState(sorts[0]?.value ?? "order");
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(total);
  const [ready, setReady] = useState(false);

  // Hash-driven filters (category links elsewhere point at /products#<id>).
  useEffect(() => {
    const hashed = filters.find((f) => f.fromHash);
    if (!hashed) return;
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (hashed.options.some((o) => o.value === h)) { setValues((v) => ({ ...v, [hashed.name]: h })); setPage(0); }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [filters]);

  useEffect(() => {
    const ul = grid.current;
    if (!ul) return;
    const items = [...ul.querySelectorAll<HTMLLIElement>(":scope > li")];
    const inRange = (value: string, range: string) => {
      const [lo, hi] = range.split("-");
      const n = Number(value);
      return n >= Number(lo || 0) && (!hi || n < Number(hi));
    };
    const matches = (li: HTMLLIElement) => filters.every((f) => {
      const want = values[f.name];
      const have = li.dataset[f.attr] ?? "";
      if (want === "all") return true;
      if (want === "empty") return have === "";
      return f.kind === "range" ? have !== "" && inRange(have, want) : have === want;
    });
    const s = sorts.find((x) => x.value === sort);
    const key = (li: HTMLLIElement): number | string => {
      const raw = s?.attr ? li.dataset[s.attr] ?? "" : "";
      if (!s || s.kind === "order") return Number(li.dataset.order);
      if (s.kind === "number") return raw === "" ? Infinity : Number(raw) * (s.dir ?? 1);
      if (s.kind === "date") return -(Date.parse(raw || "1970-01-01")) * (s.dir ?? 1);
      return raw.toLowerCase();
    };
    const shown = items.filter(matches).sort((a, b) => {
      const ka = key(a), kb = key(b);
      return typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb));
    });
    const pages = Math.max(1, Math.ceil(shown.length / pageSize));
    const current = Math.min(page, pages - 1);
    items.forEach((li) => { li.hidden = true; });
    shown.forEach((li, i) => {
      ul.appendChild(li);
      li.hidden = i < current * pageSize || i >= (current + 1) * pageSize;
    });
    setCount(shown.length);
    if (current !== page) setPage(current);
    setReady(true);
  }, [values, sort, page, pageSize, filters, sorts]);

  const pages = Math.max(1, Math.ceil(count / pageSize));
  const first = count === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(count, (page + 1) * pageSize);
  const note = noteFilter ? notes.find((n) => n.value === values[noteFilter])?.text : undefined;

  const set = (name: string, value: string) => { setValues((v) => ({ ...v, [name]: value })); setPage(0); };
  const goTo = (p: number) => {
    setPage(p);
    grid.current?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <div className="catalog">
      {(filters.length > 0 || sorts.length > 1) && (
        <div className="catalog-controls" role="search" aria-label={`Filter ${label}`}>
          {filters.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={`${id}-${f.name}`}>{f.label}</label>
              <select id={`${id}-${f.name}`} value={values[f.name]} onChange={(e) => {
                set(f.name, e.target.value);
                if (f.fromHash) history.replaceState(null, "", e.target.value === "all" ? window.location.pathname : `#${e.target.value}`);
              }}>
                <option value="all">All</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
          {sorts.length > 1 && (
            <div className="field">
              <label htmlFor={`${id}-sort`}>Sort by</label>
              <select id={`${id}-sort`} value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
                {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
          <p className="result-count" role="status">{count === total ? `${total} listed` : `${count} of ${total} shown`}</p>
        </div>
      )}
      {note && <p className="catalog-note">{note}</p>}
      <ul className="card-grid" ref={grid} aria-label={label}>{children}</ul>
      {count === 0 && <p className="empty-state">Nothing matches these filters. Try another choice, or <a className="link" href="/contact">tell us what you need</a>.</p>}
      {ready && pages > 1 && (
        <nav className="pager" aria-label={`${label} pages`}>
          <button type="button" className="btn btn--quiet btn--small" disabled={page === 0} onClick={() => goTo(page - 1)}>Previous</button>
          <p aria-live="polite">Showing {first} to {last} of {count}</p>
          <button type="button" className="btn btn--quiet btn--small" disabled={page >= pages - 1} onClick={() => goTo(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}
