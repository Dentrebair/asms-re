// Drives headless Chrome through the shared catalogue on /products and /properties.
// Usage: node tests/browser/catalog.mjs <work-dir>   (a server must serve dist/client on :54401)
import { spawn } from "node:child_process";

const BASE = "http://127.0.0.1:54401";
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--remote-debugging-port=9334", "--window-size=1440,900", `--user-data-dir=${process.argv[2]}/cat-profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const out = [];
const check = (l, ok, x = "") => out.push(`${ok ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
for (let i = 0; i < 50 && !ws; i++) {
  try { const t = await (await fetch("http://127.0.0.1:9334/json/list")).json(); const p = t.find((x) => x.type === "page"); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch { /* not up yet */ }
  await sleep(200);
}
if (ws.readyState !== 1) await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const js = async (expression) => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (url) => { await cdp("Page.navigate", { url }); await sleep(1500); };
const visible = `[...document.querySelectorAll('.card-grid > li')].filter(li => !li.hidden).map(li => li.querySelector('h3').textContent)`;
const setSelect = (label, value) => js(`(() => { const l=[...document.querySelectorAll('.catalog-controls label')].find(x=>x.textContent===${JSON.stringify(label)}); const el=document.getElementById(l.htmlFor); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
const type = (value) => js(`(() => { const el = document.querySelector('.field--search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`);
const tab = (label) => js(`[...document.querySelectorAll('.catalog-tabs button')].find(b=>b.textContent===${JSON.stringify(label)}).click()`);
const url = () => js(`location.search`);
const labels = () => js(`[...document.querySelectorAll('.catalog-controls label')].map(l=>l.textContent)`);

try {
  await cdp("Page.enable"); await cdp("Runtime.enable");

  // products
  await go(`${BASE}/products`);
  let v = await js(visible);
  check("products page 1 shows 6 (3 x 2)", v.length === 6, v.join(", "));
  check("pager reads 1 to 6 of 12", (await js(`document.querySelector('.pager p')?.textContent`)) === "Showing 1 to 6 of 12");
  check("grid is 3 columns at 1440", (await js(`getComputedStyle(document.querySelector('.card-grid')).gridTemplateColumns.split(' ').length`)) === 3);
  await js(`[...document.querySelectorAll('.pager button')].find(b=>b.textContent==='Next').click()`); await sleep(400);
  check("Next shows the other 6 and puts page=2 in the URL", (await js(visible)).length === 6 && (await url()) === "?page=2", await url());
  await go(`${BASE}/products?category=roofing`);
  v = await js(visible);
  check("?category=roofing opens the roofing tab", v.length === 4 && v.includes("AAC blocks") && (await js(`document.querySelector('.catalog-tabs [aria-pressed=true]').textContent`)).startsWith("Roofing"), v.join(", "));
  check("category intro shown", ((await js(`document.querySelector('.catalog-note')?.textContent`)) ?? "").startsWith("Roofing sheets"));
  await go(`${BASE}/products#steel-peb`);
  check("old #steel-peb links still work", (await js(visible)).length === 4 && (await js(visible)).includes("PEB frames"));
  await go(`${BASE}/products`);
  await type("IS 2062"); await sleep(300);
  v = await js(visible);
  check("search finds a product by its standard", v.length === 1 && v[0] === "Structural sections", v.join(", "));

  // properties
  await go(`${BASE}/properties`);
  v = await js(visible);
  check("properties shows the 6 live listings, not the sold one", v.length === 6 && !v.includes("Corner residential plot"), v.join(", "));
  check("type tabs per PRD", (await js(`[...document.querySelectorAll('.catalog-tabs button')].map(b=>b.textContent).join('|')`)) === "All|Apartments and houses|Plots and land|Commercial|Agricultural");
  check("no Bedrooms filter on All", !(await labels()).includes("Bedrooms"), (await labels()).join(","));
  await tab("Plots and land"); await sleep(300);
  check("Plots tab: 2 listings, ?type=plot", (await js(visible)).length === 2 && (await url()) === "?type=plot", await url());
  check("Plots tab: road width, no bedrooms", (await labels()).includes("Road width") && !(await labels()).includes("Bedrooms"), (await labels()).join(","));
  await tab("Apartments and houses"); await sleep(300);
  check("Homes tab: bedrooms filter appears", (await labels()).includes("Bedrooms") && !(await labels()).includes("Road width"), (await labels()).join(","));
  await setSelect("Bedrooms", "3"); await sleep(300);
  v = await js(visible);
  check("3 BHK filter", v.length === 1 && v[0] === "Independent house" && (await url()) === "?type=residential&bhk=3", `${await url()} ${v.join(",")}`);
  check("applied filter chip shown", (await js(`document.querySelector('.chips')?.textContent ?? ''`)).includes("Bedrooms: 3 BHK"));
  await js(`history.back()`); await sleep(500);
  check("Back undoes the last filter", (await js(visible)).length === 2 && (await url()) === "?type=residential", await url());
  await type("PREVIEW-04"); await sleep(300);
  check("search by reference", (await js(visible)).join() === "Two-bedroom apartment");
  await go(`${BASE}/properties?type=agricultural`);
  check("shared URL restores the tab", (await js(visible)).length === 1 && (await labels()).includes("Area"));
  await go(`${BASE}/properties?budget=empty`);
  check("budget: price on request = 5", (await js(visible)).length === 5);
  await js(`[...document.querySelectorAll('.chips .link')].find(b=>b.textContent==='Clear all').click()`); await sleep(300);
  check("Clear all", (await js(visible)).length === 6 && (await url()) === "");
  await setSelect("Sort by", "area"); await sleep(300);
  check("sort by area puts the 2.5 acres first", (await js(visible))[0] === "Agricultural land");
  await go(`${BASE}/properties/sold-plot-sample`);
  check("sold page says sold, no enquiry button", await js(`document.body.textContent.includes('This property has been sold') && !document.body.textContent.includes('Enquire about property')`));

  await go(`${BASE}/`);
  check("home shows 3 x 2 properties", (await js(`document.querySelectorAll('.card-grid > li').length`)) === 6 && (await js(`getComputedStyle(document.querySelector('.card-grid')).gridTemplateColumns.split(' ').length`)) === 3);

  await cdp("Emulation.setDeviceMetricsOverride", { width: 375, height: 800, deviceScaleFactor: 1, mobile: true });
  await go(`${BASE}/properties`);
  check("phone: filters folded into a drawer", await js(`!document.querySelector('.catalog-drawer').open`));
  check("phone: no sideways scroll", await js(`document.documentElement.scrollWidth <= 375`), String(await js(`document.documentElement.scrollWidth`)));
} catch (e) { check("crashed", false, e.message); }
console.log(out.join("\n"));
chrome.kill();
process.exit(out.some((l) => l.startsWith("FAIL")) ? 1 : 0);
