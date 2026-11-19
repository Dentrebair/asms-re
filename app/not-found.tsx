import { NotAvailablePage } from "./site-components";

export const metadata = { title: "Page not found | ASMS‑ROUNAQH", robots: { index: false } };

export default function NotFound() {
  return <NotAvailablePage title="This page isn’t here" lead="The link may be old, or the page may have moved. These will take you somewhere useful." />;
}
