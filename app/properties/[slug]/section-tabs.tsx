"use client";

import { useEffect, useState } from "react";
import { Tab, TabList } from "@astryxdesign/core/TabList";

/** Sticky in-page tabs: each links to its section, and the one on screen is selected. */
export default function SectionTabs({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  return (
    <TabList value={active} onChange={setActive} hasDivider overflow="auto">
      {sections.map((s) => <Tab key={s.id} value={s.id} label={s.label} href={`#${s.id}`} />)}
    </TabList>
  );
}
