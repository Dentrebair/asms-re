// Small stroke icon set (24×24, currentColor) used by the property and product pages.
const PATHS = {
  area: "M4 4h16v16H4z M4 9h5 M15 4v5 M9 20v-5 M20 15h-5",
  ruler: "M3 17 17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2",
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M15.5 8.5l-2 5-5 2 2-5z",
  road: "M8 3 5 21 M16 3l3 18 M12 4v3 M12 10v3 M12 16v3",
  shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4",
  key: "M15 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M10.5 13.5 3 21 M6 18l2 2",
  rupee: "M6 4h12 M6 9h12 M9 4c5 0 5 10 0 10H6l9 7",
  water: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7z",
  drain: "M4 10h16 M6 10v4a6 6 0 0 0 12 0v-4 M9 14h6 M12 4v6",
  lamp: "M12 21V9 M8 21h8 M7 5h10l-2 4H9z",
  wall: "M3 6h18v12H3z M3 12h18 M9 6v6 M15 6v6 M6 12v6 M12 12v6 M18 12v6",
  gate: "M4 21V5 M20 21V5 M4 8h16 M8 8v13 M12 8v13 M16 8v13",
  tree: "M12 22v-6 M12 2 6 11h3l-4 6h14l-4-6h3z",
  cctv: "M3 6l14 4-2 5L3 11z M15 15l2 4h4 M7 11.5 6 15",
  bus: "M5 4h14v13H5z M5 11h14 M8 20v-3 M16 20v-3 M8 14h.01 M16 14h.01",
  school: "M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5",
  hospital: "M4 4h16v16H4z M12 8v8 M8 12h8",
  cart: "M3 4h2l2.5 11h11L21 7H6 M9 20h.01 M18 20h.01",
  layers: "M12 3 2 8l10 5 10-5z M2 13l10 5 10-5 M2 18l10 5 10-5",
  roof: "M2 12 12 4l10 8 M5 10v10h14V10",
  brick: "M3 5h18v14H3z M3 10h18 M3 14.5h18 M9 5v5 M15 5v5 M6 10v4.5 M12 10v4.5 M18 10v4.5 M9 14.5V19 M15 14.5V19",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
