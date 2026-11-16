"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { MobileNav } from "@astryxdesign/core/MobileNav";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { HStack } from "@astryxdesign/core/Layout";

// PRD section 4: Discover properties, Construction products, Services, About, Sell a property.
export const NAV_LINKS = [
  { href: "/properties", label: "Properties" },
  { href: "/products", label: "Products" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/sell", label: "Sell a property" },
];

function MenuGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Site header: Astryx TopNav on wide screens, a MobileNav drawer on phones. */
export default function SiteHeader({ brand }: { brand: string }) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const current = (href: string) => path === href || path.startsWith(`${href}/`);
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no image optimiser
    <img className="brand-logo" src="/brand/logo-script.webp" alt={`${brand} home`} width={260} height={160} />
  );

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <TopNav
          label="Primary"
          heading={<TopNavHeading logo={logo} headingHref="/" />}
          endContent={
            <HStack gap={2} vAlign="center">
              <span className="only-wide">
                <HStack gap={1}>
                  {NAV_LINKS.map((l) => <TopNavItem key={l.href} href={l.href} label={l.label} isSelected={current(l.href)} />)}
                </HStack>
              </span>
              <Button href="/contact" label="Enquire" variant="primary" size="md" />
              <span className="only-narrow">
                <IconButton label="Open menu" icon={<MenuGlyph />} variant="ghost" onClick={() => setOpen(true)} />
              </span>
            </HStack>
          }
        />
      </header>
      <MobileNav isOpen={open} onOpenChange={setOpen} header={brand} side="end">
        <SideNavSection title="Menu">
          <SideNavItem label="Home" href="/" isSelected={path === "/"} />
          {NAV_LINKS.map((l) => <SideNavItem key={l.href} label={l.label} href={l.href} isSelected={current(l.href)} />)}
          <SideNavItem label="Contact" href="/contact" isSelected={current("/contact")} />
        </SideNavSection>
      </MobileNav>
    </>
  );
}
