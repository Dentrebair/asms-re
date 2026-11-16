"use client";

import { useState } from "react";
import { Slider } from "@astryxdesign/core/Slider";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading, Text } from "@astryxdesign/core/Text";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { VStack } from "@astryxdesign/core/Layout";
import { formatINR, monthlyEmi } from "@/lib/format";

export default function EmiCalculator({ price }: { price: number }) {
  const [loan, setLoan] = useState(Math.round(price * 0.8));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const emi = monthlyEmi(loan, rate, years);
  const totalPayable = emi * years * 12;
  const totalInterest = totalPayable - loan;
  const interestShare = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;
  const one = (v: number | number[]) => (Array.isArray(v) ? v[0] : v);

  return (
    <Grid columns={{ minWidth: 280, repeat: "fit" }} gap={6} align="start">
      <VStack gap={6}>
        <Slider label="Loan amount" value={loan} min={100_000} max={price} step={50_000} onChange={(v: number | number[]) => setLoan(one(v))} formatValue={formatINR} valueDisplay="text" />
        <Slider label="Interest rate (p.a.)" value={rate} min={6} max={15} step={0.05} onChange={(v: number | number[]) => setRate(one(v))} formatValue={(v: number) => `${v.toFixed(2)}%`} valueDisplay="text" />
        <Slider label="Loan tenure" value={years} min={1} max={30} step={1} onChange={(v: number | number[]) => setYears(one(v))} formatValue={(v: number) => `${v} years`} valueDisplay="text" />
      </VStack>
      <Card variant="muted" padding={6}>
        <VStack gap={4}>
          <VStack gap={1} aria-live="polite">
            <Text type="supporting">Estimated monthly EMI</Text>
            <Heading level={3} type="display-3"><span className="num">{formatINR(emi)}</span></Heading>
          </VStack>
          <div className="emi-bar" aria-hidden="true"><span style={{ width: `${100 - interestShare}%` }} /></div>
          <MetadataList>
            <MetadataListItem label="Principal">{formatINR(loan)}</MetadataListItem>
            <MetadataListItem label="Total interest">{formatINR(totalInterest)}</MetadataListItem>
            <MetadataListItem label="Total payable">{formatINR(totalPayable)}</MetadataListItem>
          </MetadataList>
          <Text type="supporting" as="p">Indicative only. Actual EMI depends on your lender, eligibility and charges.</Text>
        </VStack>
      </Card>
    </Grid>
  );
}
