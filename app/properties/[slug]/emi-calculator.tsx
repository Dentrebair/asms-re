"use client";

import { useId, useState } from "react";
import { formatINR, monthlyEmi } from "@/lib/format";

export default function EmiCalculator({ price }: { price: number }) {
  const [loan, setLoan] = useState(Math.round(price * 0.8));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const id = useId();

  const emi = monthlyEmi(loan, rate, years);
  const totalPayable = emi * years * 12;
  const totalInterest = totalPayable - loan;
  const interestShare = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;

  const fields = [
    { key: "loan", label: "Loan amount", value: loan, set: setLoan, min: 100_000, max: price, step: 50_000, display: formatINR(loan) },
    { key: "rate", label: "Interest rate (p.a.)", value: rate, set: setRate, min: 6, max: 15, step: 0.05, display: `${rate.toFixed(2)}%` },
    { key: "years", label: "Loan tenure", value: years, set: setYears, min: 1, max: 30, step: 1, display: `${years} years` },
  ];

  return (
    <div className="emi-calculator">
      <div className="emi-inputs">
        {fields.map((field) => (
          <div key={field.key} className="emi-field">
            <label htmlFor={`${id}-${field.key}`}><span>{field.label}</span><strong>{field.display}</strong></label>
            <input
              id={`${id}-${field.key}`}
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={field.value}
              onChange={(event) => field.set(Number(event.target.value))}
            />
          </div>
        ))}
      </div>
      <div className="emi-result" aria-live="polite">
        <small>Estimated monthly EMI</small>
        <strong>{formatINR(emi)}</strong>
        <div className="emi-bar" aria-hidden="true"><span style={{ width: `${100 - interestShare}%` }} /></div>
        <dl>
          <div><dt><i className="dot-principal" />Principal</dt><dd>{formatINR(loan)}</dd></div>
          <div><dt><i className="dot-interest" />Total interest</dt><dd>{formatINR(totalInterest)}</dd></div>
          <div><dt>Total payable</dt><dd>{formatINR(totalPayable)}</dd></div>
        </dl>
        <p>Indicative only. Actual EMI depends on your lender, eligibility and charges.</p>
      </div>
    </div>
  );
}
