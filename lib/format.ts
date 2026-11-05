const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Full rupee amount with Indian digit grouping, e.g. ₹48,00,000. */
export const formatINR = (value: number) => inr.format(Math.round(value));

/** Short Indian notation used on property portals, e.g. ₹48 L, ₹1.25 Cr. */
export function formatINRShort(value: number) {
  if (value >= 1e7) return `₹${+(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${+(value / 1e5).toFixed(2)} L`;
  return formatINR(value);
}

/** Standard reducing-balance EMI. */
export function monthlyEmi(principal: number, annualRatePct: number, years: number) {
  const n = years * 12;
  const r = annualRatePct / 12 / 100;
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  const f = (1 + r) ** n;
  return (principal * r * f) / (f - 1);
}
