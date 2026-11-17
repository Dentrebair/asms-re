"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Selector } from "@astryxdesign/core/Selector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/Layout";
import { IndianRupee, MapPin, Search } from "lucide-react";

type Option = { value: string; label: string };

/**
 * The home page search: property type, a place or reference, and a budget. It opens
 * /properties with the same URL parameters the catalogue reads (?type=&q=&budget=),
 * so the results page shows exactly this search and the link can be shared.
 */
export default function HomeSearch({ types, budgets }: { types: Option[]; budgets: Option[] }) {
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState("all");

  function submit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (q.trim()) params.set("q", q.trim().slice(0, 80));
    if (budget !== "all") params.set("budget", budget);
    const query = params.toString();
    window.location.assign(`/properties${query ? `?${query}` : ""}`);
  }

  return (
    <Card padding={5} elevation="high" className="home-search">
      <form onSubmit={submit} role="search" aria-label="Search properties">
        <VStack gap={4}>
          <div className="home-search-types">
            <SegmentedControl label="Property type" value={type} onChange={setType} size="sm" layout="hug">
              <SegmentedControlItem value="all" label="All" />
              {types.map((t) => <SegmentedControlItem key={t.value} value={t.value} label={t.label} />)}
            </SegmentedControl>
          </div>
          <div className="home-search-row">
            <TextInput label="Location or reference" isLabelHidden size="lg" startIcon={MapPin} value={q} onChange={setQ} hasClear
              placeholder="Locality, landmark or reference, e.g. Mannady" />
            <Selector label="Budget" isLabelHidden size="lg" startIcon={IndianRupee} value={budget}
              options={[{ value: "all", label: "Any budget" }, ...budgets]} onChange={setBudget} />
            <Button type="submit" variant="primary" size="lg" icon={<Search size={18} />} label="Search" />
          </div>
        </VStack>
      </form>
    </Card>
  );
}
