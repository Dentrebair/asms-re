import type { Metadata } from "next";
import { Albert_Sans, Manrope } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Three weights in running use: Albert Sans 600 for display, Manrope 400 and 700.
const display = Albert_Sans({ variable: "--font-albert", subsets: ["latin"], weight: ["600"], display: "swap" });
const sans = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ASMS‑ROUNAQH | Property, construction products and services in Chennai",
  description: "Plots and homes in and around Chennai, specified construction products and engineering services from one accountable team.",
  alternates: { canonical: "/" },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  openGraph: { siteName: "ASMS‑ROUNAQH", locale: "en_IN", type: "website", images: [{ url: "/asms-hero.webp" }] },
};

const SPECULATION_RULES = {"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"/admin"}},{"not":{"href_matches":"/admin/*"}},{"not":{"selector_matches":"[target=_blank], [download], [href$='.pdf']"}}]},"eagerness":"moderate"}]};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables sit on <html> so the :root tokens can read them.
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        {/* Marks that scripts run, so script-only controls can hide without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Hallmark's render check reads hero postures from page styles; Tailwind strips CSS comments, so they ride here. */}
        <style dangerouslySetInnerHTML={{ __html: "/* Hallmark · hero: Ledge (/), Banner (/properties), Banner (/products), Banner (/contact) · posture: committed · shape: Photographic · job: buy */" }} />
        {/* Speculation rules: fetch a page while the visitor hovers or presses its link, so it opens
            instantly. Prefetch only, never prerender: a prerendered property page would run its
            3-second view counter for a page nobody looked at. Admin is excluded. */}
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: JSON.stringify(SPECULATION_RULES) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
