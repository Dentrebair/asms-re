"use client";

// The Astryx theme wrappers. They live in a client module because the built theme
// object carries icon components, which cannot cross from a server component.
import type { ReactNode } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { asmsTheme } from "./asms";

/** The site's root theme: ASMS light. */
export function SiteTheme({ children }: { children: ReactNode }) {
  return <Theme theme={asmsTheme} mode="light">{children}</Theme>;
}

/** A forest-green band: the theme's dark mode is the brand's paper-on-green. */
export function ForestTheme({ children }: { children: ReactNode }) {
  return <Theme theme={asmsTheme} mode="dark">{children}</Theme>;
}
