"use client";

import { useEffect } from "react";

/**
 * As each panel of a pinned section scrolls into the middle of the screen,
 * marks the rows of the pinned visual that belong to it. Without script (or
 * with reduced motion) the visual simply shows every row.
 */
export default function PinnedHighlight({ root }: { root: string }) {
  useEffect(() => {
    const section = document.getElementById(root);
    if (!section) return;
    const rows = [...section.querySelectorAll<HTMLElement>("[data-step]")];
    const panels = [...section.querySelectorAll<HTMLElement>("[data-panel]")];
    const show = (step: string) => {
      rows.forEach((r) => r.classList.toggle("is-active", r.dataset.step === step));
      panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === step));
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) show((e.target as HTMLElement).dataset.panel ?? ""); }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [root]);
  return null;
}
