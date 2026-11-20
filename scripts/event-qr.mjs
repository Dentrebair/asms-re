// Writes the event QR code (links to /event-offer?src=qr, counted as a scan) as a
// print-quality PNG and an SVG under public/event/. Usage: node scripts/event-qr.mjs
import QRCode from "qrcode";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = "https://asmsrounaqh.com/event-offer?src=qr"; // keep in step with EVENT.qrUrl in lib/event.ts
const out = join(root, "public", "event");
await mkdir(out, { recursive: true });
const options = { errorCorrectionLevel: "H", margin: 2, color: { dark: "#0f3d33", light: "#ffffff" } };
await QRCode.toFile(join(out, "event-offer-qr.png"), url, { ...options, width: 1200 });
await QRCode.toFile(join(out, "event-offer-qr.svg"), url, { ...options, type: "svg" });
console.log(`QR for ${url} -> public/event/event-offer-qr.png and .svg`);
