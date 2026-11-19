// Drives headless Chrome through the seller portal and the admin review queue.
// Usage: node drive.mjs <work-dir> <photo-path> <pdf-path>   (see run.sh)
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [, , work, photo, pdf] = process.argv;
const BASE = "http://localhost:54401";
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9334", "--window-size=1280,1000", `--user-data-dir=${work}/profile`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const results = [];
const check = (label, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${label}${extra && !ok ? ` — ${extra}` : ""}`); };

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch("http://127.0.0.1:9334/json/list")).json();
      const page = targets.find((t) => t.type === "page");
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
    } catch { /* not up yet */ }
    await sleep(200);
  }
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
}
const cdp = (method, params = {}) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
const js = async (expression) => {
  const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "eval error");
  return r.result?.result?.value;
};
const waitFor = async (expr, label, ms = 10000) => {
  for (let t = 0; t < ms; t += 150) { if (await js(expr)) return true; await sleep(150); }
  check(`wait: ${label}`, false); throw new Error(`timed out: ${label}`);
};
const has = (s) => `[...document.querySelectorAll('button,a,h1,h2,legend,[role=status]')].some(e => e.textContent.trim().startsWith(${JSON.stringify(s)}))`;
const el = (s) => `[...document.querySelectorAll('button,a,[role=option],[role=menuitem]')].find(e => e.textContent.trim().startsWith(${JSON.stringify(s)}))`;
const click = (s) => js(`(() => { const e = ${el(s)}; if (!e) throw new Error('no element: ' + ${JSON.stringify(s)}); e.click(); })()`);
const isDisabled = (s) => js(`(() => { const e = ${el(s)}; return !!e && (e.disabled || e.getAttribute('aria-disabled') === 'true'); })()`);
const fieldOf = (label) => `(() => {
  const l = [...document.querySelectorAll('label')].find(x => x.textContent.replace('*','').trim().startsWith(${JSON.stringify(label)}));
  return l?.htmlFor ? document.getElementById(l.htmlFor) : l?.querySelector('input,select,textarea,button');
})()`;
// Astryx inputs are React-controlled: set through the native setter, then blur (NumberInput commits on blur).
const fill = (label, value) => js(`(() => {
  const el = ${fieldOf(label)}; if (!el) throw new Error('no field ' + ${JSON.stringify(label)});
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
  el.focus(); Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true })); el.blur();
})()`);
const tick = (label) => js(`(() => { const l = [...document.querySelectorAll('label')].find(x => x.textContent.trim().startsWith(${JSON.stringify(label)})); if (!l) throw new Error('no checkbox ' + ${JSON.stringify(label)}); l.click(); })()`);
const toast = () => js(`document.querySelector('.adm-toast [data-toast-message]')?.textContent.trim() ?? ''`);
const setFiles = async (selector, files) => {
  const { root } = (await cdp("DOM.getDocument")).result;
  const { nodeId } = (await cdp("DOM.querySelector", { nodeId: root.nodeId, selector })).result;
  if (!nodeId) throw new Error(`no file input ${selector}`);
  await cdp("DOM.setFileInputFiles", { nodeId, files });
};
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(`${work}/${name}.png`, Buffer.from(r.result.data, "base64")); };
const db = () => JSON.parse(readFileSync(`${work}/demo/db.json`, "utf8"));
const listing = () => db().properties.find((p) => p.title === "Residential plot near Tambaram station");
const nav = async (path) => { await cdp("Page.navigate", { url: `${BASE}${path}` }); await sleep(400); };
const signOutAll = () => js(`localStorage.clear()`);

async function sellerSignIn(email, name) {
  await signOutAll();
  await nav("/seller");
  await waitFor(has("Continue with Google"), "seller sign-in");
  await click("Continue with Google");
  await waitFor(`location.pathname === '/auth/v1/authorize'`, "demo Google page");
  await js(`(() => { const f = document.querySelector('form'); f.email.value = ${JSON.stringify(email)}; f.name.value = ${JSON.stringify(name)}; f.submit(); })()`);
  await waitFor(`location.pathname === '/seller' && (${has("About you")} || ${has("My listings")})`, "back in the seller portal");
}
async function staffSignIn() {
  await signOutAll();
  await nav("/admin");
  await waitFor(has("Staff sign in"), "staff sign-in");
  await fill("Email", "demo@asms.local"); await fill("Password", "demo1234");
  await click("Sign in");
  await waitFor(`!!document.querySelector('.adm-header')`, "admin header");
}
const openSubmissions = async () => {
  await js(`[...document.querySelectorAll('button.astryx-side-nav-item')].find(b => b.textContent.trim().startsWith('Submissions')).click()`);
  await waitFor(`!!document.querySelector('[data-section=submissions] table, [data-section=submissions] .adm-empty')`, "submissions list");
};
const reviewRow = async (title) => {
  await waitFor(`[...document.querySelectorAll('tr')].some(r => r.textContent.includes(${JSON.stringify(title)}))`, `row ${title}`);
  await js(`[...document.querySelectorAll('tr')].find(r => r.textContent.includes(${JSON.stringify(title)})).querySelector('button').click()`);
  await waitFor(has("Decision"), "review screen");
};

try {
  await connect();
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("DOM.enable");
  // Focus and blur fire only in a focused page; NumberInput commits on blur.
  await cdp("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: "window.confirm = () => true; window.open = (u) => { if (u) window.__opened = u; return { opener: null, close() {}, location: { set href(v) { window.__opened = v; } } }; };" });
  await nav("/sell");
  check("sell page links to the seller portal", await js(`!!document.querySelector('a[href="/seller"]')`));

  // 1. Google sign-in, then onboarding
  await sellerSignIn("priya@demo.local", "Priya Raman");
  check("first sign-in asks who the seller is", await js(has("About you")));
  check("name comes from the Google account", (await js(`${fieldOf("Your name")}.value`)) === "Priya Raman");
  await js(`document.querySelector('input[type=radio][value=broker]').click()`);
  await waitFor(`!!${fieldOf("Company or firm")}`, "company field for brokers");
  await fill("Mobile number", "98401 77665");
  await fill("Company or firm", "Raman Realty");
  await click("Continue");
  await waitFor(`!!document.querySelector('.adm-toast-error')`, "terms error");
  check("terms must be accepted", (await toast()).includes("accept the terms"));
  await tick("I accept the terms");
  await click("Continue");
  await waitFor(has("My listings"), "dashboard");
  const me = db().seller_profiles.find((s) => s.email === "priya@demo.local");
  check("profile saved as a broker, active", me?.seller_type === "broker" && me.company === "Raman Realty" && me.status === "active" && me.phone === "98401 77665", JSON.stringify(me));
  check("empty dashboard invites a first listing", await js(has("List your first property")));
  await shot("1-dashboard-empty");

  // 2. The wizard: a draft saves itself
  await click("List a property");
  await waitFor(has("The property"), "step 1");
  await fill("Title", "Residential plot near Tambaram station");
  await waitFor(`document.querySelector('.sel-save')?.textContent === 'Draft saved'`, "autosave", 6000);
  const draft = listing();
  check("draft autosaved with a seller reference", draft?.stage === "draft" && /^ASMS-S\d{4}$/.test(draft.reference) && draft.seller_id === me.user_id, JSON.stringify(draft && { stage: draft.stage, reference: draft.reference }));
  await click("Next: Location");
  await waitFor(`!!document.querySelector('#sec-location')`, "step 2");
  await fill("Location", "Tambaram, Chennai");
  await click("Next: Price & details");
  await waitFor(`!!document.querySelector('#sec-price-and-size')`, "step 3");
  check("location saved when moving on", listing()?.location === "Tambaram, Chennai");
  await fill("Price (₹)", "4800000");
  await fill("Area (sq ft)", "1200");
  await fill("Description", "A 1,200 sq ft residential plot on a 30 ft road, ten minutes' walk from Tambaram railway station.");
  check("type-specific fields shown for a plot", await js(`!!document.querySelector('#sec-land-details')`));
  await click("Next: Photos");
  await waitFor(`!!document.querySelector('#sec-photos')`, "step 4");
  await setFiles('.adm-photos input[type="file"]', [photo, photo, photo]);
  await waitFor(`document.querySelectorAll('.adm-photo-grid figure').length === 3`, "three photos", 20000);
  await setFiles('input[aria-label="Document file"]', [pdf]);
  await waitFor(`document.querySelectorAll('.sel-docs li').length === 1`, "document uploaded", 8000);
  const docs = db().seller_documents.filter((d) => d.seller_id === me.user_id);
  check("private document saved under the seller's own folder", docs.length === 1 && docs[0].path.startsWith(`${me.user_id}/${draft.id}/`) && docs[0].label === "Patta", JSON.stringify(docs));
  await shot("2-wizard-photos");
  await click("Next: Review & send");
  await waitFor(`!!document.querySelector('#sec-review')`, "step 5");
  await sleep(1500);
  check("photos saved to the draft under the seller's folder", listing()?.images.length === 3 && listing().images.every((i) => i.path.startsWith(`sellers/${me.user_id}/`)));
  check("review step says it is ready", await js(`document.querySelector('#sec-review').textContent.includes('Ready to send')`), await js(`document.querySelector('#sec-review').textContent`));
  check("send is disabled until the declaration is ticked", await isDisabled("Send for review"));
  await tick("I am authorised to sell");
  await click("Send for review");
  await waitFor(`${has("My listings")} && document.querySelector('.sel-listing')?.textContent.includes('Submitted')`, "submitted listing on dashboard");
  check("listing is submitted, not live", listing()?.stage === "submitted");
  await shot("3-dashboard-submitted");

  // 3. Staff: the private document, then send it back with a note
  const staffToken = `demo.${Buffer.from("demo@asms.local").toString("base64url")}`;
  const sign = async (token) => fetch(`${BASE}/storage/v1/object/sign/seller-docs/${docs[0].path}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: '{"expiresIn":60}' });
  const signed = await (await sign(staffToken)).json();
  const file = signed.signedURL ? await (await fetch(`${BASE}/storage/v1${signed.signedURL}`)).text() : "";
  check("staff open the document through a short-lived link", file.startsWith("%PDF"));
  check("visitors and other sellers cannot get a link", !(await (await sign("anon")).json()).signedURL
    && !(await (await sign(`demo.${Buffer.from("lakshmi@demo.local").toString("base64url")}`)).json()).signedURL);
  check("no public link to the document", (await fetch(`${BASE}/storage/v1/object/public/seller-docs/${docs[0].path}`)).status !== 200);

  await staffSignIn();
  check("admin shows submissions waiting", await js(`[...document.querySelectorAll('button.astryx-side-nav-item')].find(b => b.textContent.startsWith('Submissions'))?.textContent.trim() === 'Submissions2'`),
    await js(`[...document.querySelectorAll('button.astryx-side-nav-item')].map(b => b.textContent.trim()).join(',')`));
  await openSubmissions();
  await reviewRow("Residential plot near Tambaram station");
  check("review shows the seller and their documents", await js(`document.querySelector('.adm-edit-side').textContent.includes('Priya Raman') && document.querySelector('.sel-docs')?.textContent.includes('Patta')`));
  await js(`[...document.querySelectorAll('.sel-docs button')].find(b => b.textContent === 'Open').click()`);
  await waitFor(`typeof window.__opened === 'string'`, "document opened");
  check("Open gives the reviewer a signed link", await js(`window.__opened.includes('/object/sign/seller-docs/')`));
  check("approve waits for the checklist", await isDisabled("Approve and publish"));
  await click("Request changes");
  await waitFor(`!!document.querySelector('.adm-toast-error')`, "note needed");
  check("sending back needs a note", (await toast()).includes("Write a note"));
  await fill("Note to the seller", "Please add a photo of the road in front of the plot.");
  await click("Request changes");
  await waitFor(`${has("Submissions")} && !${has("Decision")}`, "back to the queue");
  check("listing sent back with the note", listing()?.stage === "changes_requested" && listing().review_note === "Please add a photo of the road in front of the plot.");
  await shot("4-admin-queue");

  // 4. Seller fixes it and sends it again
  await sellerSignIn("priya@demo.local", "Priya Raman");
  await waitFor(`document.querySelector('.sel-listing')?.textContent.includes('Changes requested')`, "changes requested on dashboard");
  check("seller sees the reviewer's note", await js(`document.querySelector('.sel-listing').textContent.includes('photo of the road')`));
  await click("Make changes");
  await waitFor(has("The property"), "wizard again");
  check("wizard shows the note at the top", await js(`document.querySelector('.sel-note')?.textContent.includes('photo of the road')`));
  await js(`[...document.querySelectorAll('.astryx-step, li')].find(s => s.textContent.includes('Pictures & documents'))?.querySelector('button')?.click()`);
  if (!(await js(`!!document.querySelector('#sec-photos')`))) { await click("Next: Location"); await sleep(300); await click("Next: Price & details"); await sleep(300); await click("Next: Photos"); }
  await waitFor(`!!document.querySelector('#sec-photos')`, "photos step");
  await setFiles('.adm-photos input[type="file"]', [photo]);
  await waitFor(`document.querySelectorAll('.adm-photo-grid figure').length === 4`, "fourth photo", 15000);
  await click("Next: Review & send");
  await waitFor(`!!document.querySelector('#sec-review')`, "review step");
  await tick("I am authorised to sell");
  await click("Send for review");
  await waitFor(`document.querySelector('.sel-listing')?.textContent.includes('Submitted')`, "resubmitted");
  check("corrected listing resubmitted with four photos", listing()?.stage === "submitted" && listing().images.length === 4);
  await js(`[...document.querySelectorAll('.sel-listing button')].find(b => b.getAttribute('aria-label')?.startsWith('More actions'))?.click()`);
  await sleep(300);
  await click("Show history");
  await waitFor(`!!document.querySelector('.sel-history li')`, "history");
  check("history shows the round trip, team actions marked", await js(`(() => { const t = document.querySelector('.sel-history').textContent; return t.includes('Sent for review again') && t.includes('Changes requested (ASMS team)'); })()`),
    await js(`document.querySelector('.sel-history').textContent`));

  // 5. Staff approve it
  await staffSignIn();
  await openSubmissions();
  await reviewRow("Residential plot near Tambaram station");
  await click("Start review");
  await waitFor(`document.querySelector('.adm-edit-main').textContent.includes('Under review')`, "under review");
  for (const item of ["Photos are real", "Location and map", "Price and area", "Ownership documents", "Description has no"]) await tick(item);
  check("approve enabled once the checklist is done", !(await isDisabled("Approve and publish")));
  await click("Approve and publish");
  await waitFor(`!${has("Decision")}`, "approved");
  const live = listing();
  check("approved listing is live with a web address", live?.stage === "live" && live.slug === `residential-plot-near-tambaram-station-${live.reference.toLowerCase()}` && Boolean(live.posted_on), JSON.stringify(live && { stage: live.stage, slug: live.slug }));

  // 6. Seller edits the live listing: the change waits for review
  await sellerSignIn("priya@demo.local", "Priya Raman");
  await waitFor(`document.querySelector('.sel-listing')?.textContent.includes('Live')`, "live on dashboard");
  await click("Edit");
  await waitFor(has("Edit ASMS-S"), "revision wizard");
  check("editing a live listing says it stays live", await js(`document.body.textContent.includes('Your listing stays live as it is')`));
  await click("Next: Location"); await sleep(200); await click("Next: Price & details");
  await waitFor(`!!document.querySelector('#sec-price-and-size')`, "price step");
  await fill("Price (₹)", "4600000");
  await click("Next: Photos"); await sleep(200); await click("Next: Review & send");
  await waitFor(`!!document.querySelector('#sec-review')`, "review");
  await tick("I am authorised to sell");
  await click("Send changes for review");
  await waitFor(`document.querySelector('.sel-listing')?.textContent.includes('Changes waiting for review')`, "pending change");
  const revs = db().property_revisions.filter((r) => r.property_id === live.id);
  check("change request holds only the new price; the live price is unchanged", revs.length === 1 && revs[0].status === "pending" && JSON.stringify(revs[0].changes) === '{"price":4600000}' && listing().price === 4800000, JSON.stringify(revs));

  // 7. Staff apply it, then suspend the seller
  await staffSignIn();
  await openSubmissions();
  await js(`[...document.querySelectorAll('.adm-stat')].find(c => c.textContent.startsWith('Change requests')).click()`);
  await reviewRow("Residential plot near Tambaram station");
  check("diff shows the price change", await js(`(() => { const t = document.querySelector('.adm-diff')?.textContent ?? ''; return t.includes('Price') && t.includes('₹48,00,000') && t.includes('₹46,00,000'); })()`));
  await shot("5-admin-diff");
  await click("Apply changes");
  await waitFor(`!${has("Decision")}`, "applied");
  check("approved change is applied to the live listing", listing()?.price === 4600000 && db().property_revisions.find((r) => r.property_id === live.id)?.status === "approved");

  await js(`[...document.querySelectorAll('button.astryx-side-nav-item')].find(b => b.textContent.trim().startsWith('Sellers')).click()`);
  await waitFor(`!!document.querySelector('[data-section=sellers] table')`, "sellers table");
  check("activity log records the approval", await js(`document.querySelector('.adm-activity')?.textContent.includes('Approved and published')`));
  await js(`[...document.querySelectorAll('tr')].find(r => r.textContent.includes('Priya Raman')).querySelector('button').click()`);
  await waitFor(`[...document.querySelectorAll('tr')].find(r => r.textContent.includes('Priya Raman'))?.textContent.includes('Suspended')`, "suspended");
  check("seller suspended", db().seller_profiles.find((s) => s.email === "priya@demo.local")?.status === "suspended");

  await sellerSignIn("priya@demo.local", "Priya Raman");
  await waitFor(has("My listings"), "dashboard");
  check("suspended seller is told, and cannot list", await js(`document.body.textContent.includes('Your seller account is suspended')`) && await isDisabled("List a property"));

  // 8. Phone width
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sellerSignIn("lakshmi@demo.local", "Lakshmi Narayanan (demo)");
  await waitFor(`!!document.querySelector('.sel-listing')`, "lakshmi's listings");
  check("phone: dashboard has no sideways scroll", await js(`document.documentElement.scrollWidth <= 390`), String(await js(`document.documentElement.scrollWidth`)));
  await shot("6-phone-dashboard");
  await click("Continue");
  await waitFor(has("The property"), "phone wizard");
  check("phone: wizard has no sideways scroll", await js(`document.documentElement.scrollWidth <= 390`), String(await js(`document.documentElement.scrollWidth`)));
  await shot("7-phone-wizard");
} catch (e) {
  check("driver crashed", false, e.message);
} finally {
  console.log(results.join("\n"));
  chrome.kill();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
