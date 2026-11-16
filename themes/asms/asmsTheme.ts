// ASMS-Rounaqh theme for Astryx: the brand's forest green, gold and warm paper on top
// of Astryx's neutral theme. Edit, then run `npm run theme:build`; the site imports the
// generated app/astryx/asms.css and asms.js.
//
// Light mode is the site. Dark mode is the brand's forest "field" (paper text on deep
// green, gold accents): sections that sit on green nest <Theme mode="dark">, so every
// Astryx component inside them picks the right colours with no extra CSS.
import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

const c = {
  forest: "#0F3E33", forestDeep: "#082D26", forestMid: "#1E5446", forestRule: "#3B6357",
  gold: "#C28D36", goldDeep: "#8A5E17", goldLight: "#DEB870",
  paper: "#F8F5EE", paper2: "#EEE9DE", paper3: "#E2DCCE", white: "#FFFFFF",
  ink: "#0C221B", muted: "#55615B", rule: "#CCD0C3",
  onField: "#F5F2E9", onField2: "#C6CCB4",
  error: "#BE2323", errorOnField: "#FF9C8F", success: "#21763C", successOnField: "#8FD3A2",
};

export const asmsTheme = defineTheme({
  name: "asms",
  extends: neutralTheme,
  typography: {
    scale: { base: 16, ratio: 1.22 },
    // next/font serves Albert Sans and Manrope under hashed names exposed as these variables.
    body: { family: "var(--font-manrope)", fallbacks: "Manrope, ui-sans-serif, system-ui, sans-serif" },
    heading: { family: "var(--font-albert)", fallbacks: "\"Albert Sans\", ui-sans-serif, system-ui, sans-serif", weights: { 1: "600", 2: "600", 3: "600", 4: "700" } },
  },
  radius: { base: 10, multiplier: 1.2 },
  tokens: {
    "--color-background-body": [c.paper, c.forest],
    "--color-background-surface": [c.paper, c.forest],
    "--color-background-card": [c.white, c.forestDeep],
    "--color-background-popover": [c.white, c.forestDeep],
    "--color-background-muted": [c.paper2, c.forestDeep],
    "--color-background-inverted": [c.forest, c.paper],

    "--color-accent": [c.forest, c.goldLight],
    "--color-accent-muted": ["#0F3E331F", "#DEB87033"],
    "--color-on-accent": [c.paper, c.ink],
    "--color-text-accent": [c.forest, c.goldLight],
    "--color-icon-accent": [c.goldDeep, c.goldLight],

    "--color-text-primary": [c.ink, c.onField],
    "--color-text-secondary": [c.muted, c.onField2],
    "--color-text-disabled": ["#9AA39E", "#7F9A90"],
    "--color-icon-primary": [c.ink, c.onField],
    "--color-icon-secondary": [c.muted, c.onField2],
    "--color-on-dark": c.paper,
    "--color-on-light": c.ink,

    "--color-border": ["#0C221B24", "#F5F2E92E"],
    "--color-border-emphasized": [c.rule, c.forestRule],
    "--color-neutral": ["#0C221B12", "#F5F2E91F"],
    "--color-overlay": ["#082D26A6", "#000000B3"],
    "--color-overlay-hover": ["#0C221B0D", "#F5F2E914"],
    "--color-overlay-pressed": ["#0C221B1A", "#F5F2E924"],
    "--color-shadow": ["#0C221B1F", "#00000059"],
    "--color-track": [c.paper3, c.forestRule],
    "--color-skeleton": [c.paper3, c.forestRule],

    "--color-success": [c.success, c.success],
    "--color-text-success": [c.success, c.successOnField],
    "--color-error": [c.error, c.error],
    "--color-text-error": [c.error, c.errorOnField],
    "--color-warning": [c.gold, c.gold],
    "--color-on-warning": [c.ink, c.ink],
    "--color-warning-muted": ["#C28D3633", "#DEB87033"],
    "--color-on-warning-muted": [c.goldDeep, c.goldLight],
    "--color-text-warning": [c.goldDeep, c.goldLight],
    "--color-info": [c.forestMid, c.goldLight],
    "--color-info-muted": ["#1E544624", "#F5F2E91F"],
    "--color-on-info-muted": [c.forest, c.onField],
    "--color-text-info": [c.forestMid, c.goldLight],
  },
});
