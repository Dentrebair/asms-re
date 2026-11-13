// Drives headless Chrome over the DevTools protocol through the admin panel.
// Usage: node drive.mjs <screenshot-dir> <photo-path>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [, , shots, photo] = process.argv;
const BASE = "http://127.0.0.1:54401";
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9333", "--window-size=1280,1000", `--user-data-dir=${shots}/profile`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const results = [];
const check = (label, ok, extra = "") => { results.push(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`); };

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
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
const waitFor = async (expr, label, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) { if (await js(expr)) return true; await sleep(150); }
  check(`wait: ${label}`, false); return false;
};
const text = (s) => `[...document.querySelectorAll('button,a,legend,h1,h2,strong')].find(e => e.textContent.trim().startsWith(${JSON.stringify(s)}))`;
const click = (s) => js(`(() => { const el = ${text(s)}; if (!el) throw new Error('no element: ' + ${JSON.stringify(s)}); el.click(); })()`);
// Sets a React-controlled input by its label text.
const fill = (label, value) => js(`(() => {
  const l = [...document.querySelectorAll('label')].find(x => x.textContent.replace('*','').trim().startsWith(${JSON.stringify(label)}));
  const el = l?.htmlFor ? document.getElementById(l.htmlFor) : l?.querySelector('input,select,textarea');
  if (!el) throw new Error('no field ' + ${JSON.stringify(label)});
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
  Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
})()`);
const shot = async (name) => { const r = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(`${shots}/${name}.png`, Buffer.from(r.result.data, "base64")); };
const backend = async () => (await fetch(`${BASE}/__log`)).json();
const toast = () => js(`document.querySelector('.adm-toast span')?.textContent ?? ''`);

let b;
try {
  await connect();
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("DOM.enable");
  await cdp("Page.navigate", { url: `${BASE}/admin` });

  // 1. sign-in screen, wrong password, then right password
  await waitFor(`!!document.querySelector('.adm-card h1')`, "sign-in screen");
  check("shows staff sign-in", (await js(`document.querySelector('.adm-card h1').textContent`)) === "Staff sign in");
  await shot("1-signin");
  await fill("Email", "owner@asms.test"); await fill("Password", "wrong");
  await click("Sign in");
  await waitFor(`!!document.querySelector('.adm-toast-error')`, "error toast");
  check("wrong password message", (await toast()) === "Wrong email or password.", await toast());
  await fill("Password", "correct-horse");
  await click("Sign in");
  await waitFor(`!!document.querySelector('.adm-header')`, "admin header");
  check("owner sees all four tabs, Enquiries first with 1 new", await js(`[...document.querySelectorAll('.adm-header nav button')].map(b=>b.textContent).join(',') === 'Enquiries1,Properties,Products,Staff'`),
    await js(`[...document.querySelectorAll('.adm-header nav button')].map(b=>b.textContent).join(',')`));

  // 1b. enquiries inbox: contact links, status, notes
  await waitFor(`document.body.textContent.includes('Ravi Kumar')`, "enquiry listed");
  check("enquiry shows call, WhatsApp and email links", await js(`(() => { const a = [...document.querySelectorAll('.adm-enquiry-contact a')].map(x => x.getAttribute('href'));
    return a[0] === 'tel:9840012345' && a[1] === 'https://wa.me/919840012345' && a[2].startsWith('mailto:ravi@example.com?subject='); })()`));
  check("message keeps its line breaks", await js(`getComputedStyle(document.querySelector('.adm-enquiry-message')).whiteSpace === 'pre-wrap'`));
  await shot("1b-enquiries");
  await js(`(() => { const el = document.querySelector('.adm-enquiry-head select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el, 'contacted'); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitFor(`document.body.textContent.includes('No new enquiries')`, "moved out of New");
  b = await backend();
  check("status change patches only status", JSON.stringify(b.log.filter((l) => l.op === "update" && l.table === "enquiries").pop()) === JSON.stringify({ op: "update", table: "enquiries", filter: [["id", "eq.enq-1"]], change: { status: "contacted" } }));
  check("badge clears when nothing is new", await js(`!document.querySelector('.adm-count')`));
  await click("All");
  await waitFor(`!!document.querySelector('.adm-enquiry-notes textarea')`, "enquiry in All");
  await js(`(() => { const el = document.querySelector('.adm-enquiry-notes textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el, 'Called, visit on Saturday'); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click("Save note");
  await waitFor(`(document.querySelector('.adm-toast span')?.textContent ?? '') === 'Note saved.'`, "note saved");
  b = await backend();
  check("note saved", b.db.enquiries[0].notes === "Called, visit on Saturday");
  await js(`(() => { const el = document.querySelector('.adm-enquiry-work select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el, 'owner@asms.test'); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await js(`(() => { const el = document.querySelector('.adm-enquiry-work input[type=date]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, '2026-12-01'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(500);
  b = await backend();
  check("assign to a staff member and set a follow-up date", b.db.enquiries[0].assigned_to === "owner@asms.test" && b.db.enquiries[0].follow_up_on === "2026-12-01", JSON.stringify(b.db.enquiries[0]).slice(0, 200));
  check("repeat contact flag shown", await js(`!!document.querySelector('.adm-flag')`));
  await js(`document.querySelector('.adm-filter input, .adm-toolbar .adm-check input').click()`);
  check("assigned-to-me filter keeps it", await js(`document.querySelectorAll('.adm-enquiries > li').length === 1`));

  // 2. create a property with a photo
  await click("Properties");
  await waitFor(`document.body.textContent.includes('No properties yet')`, "empty properties list");
  await click("+ New property");
  await waitFor(`!!document.querySelector('.adm-form')`, "property form");
  await fill("Title", "East-facing plot in Tambaram");
  await fill("Reference", "ASMS-0001");
  await fill("Location", "Tambaram, Chennai");
  await fill("Price (₹)", "5200000");
  await fill("Area (sq ft)", "1200");
  await fill("Facing", "East");
  await fill("Corner plot", "yes");
  check("slug auto-generated", (await js(`[...document.querySelectorAll('input')].find(i=>i.value.includes('tambaram'))?.value`)) === "east-facing-plot-in-tambaram-asms-0001");
  check("price preview shows lakhs", await js(`document.body.textContent.includes('₹52 L · ₹52,00,000 · ₹4,333/sq ft')`));
  await js(`[...document.querySelectorAll('.adm-check')].find(l=>l.textContent.startsWith('Water supply')).querySelector('input').click()`);
  await fill("Stage", "live");
  check("plot shows land fields, not home fields", await js(`document.body.textContent.includes('Land details') && !document.body.textContent.includes('Home details')`));
  await click("+ Add place");
  await js(`(() => { const row = document.querySelector('.adm-row'); const inp = row.querySelectorAll('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    set.call(inp[0], 'Tambaram station'); inp[0].dispatchEvent(new Event('input',{bubbles:true})); set.call(inp[1], '1.5 km'); inp[1].dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const { root } = (await cdp("DOM.getDocument")).result;
  const { nodeId } = (await cdp("DOM.querySelector", { nodeId: root.nodeId, selector: '.adm-photos input[type="file"]' })).result;
  await cdp("DOM.setFileInputFiles", { nodeId, files: [photo, photo] });
  await waitFor(`document.querySelectorAll('.adm-photo-grid figure').length === 2`, "two photos uploaded", 15000);
  check("cover badge on first photo", await js(`document.querySelector('.adm-photo-grid figure .adm-cover')?.textContent === 'Cover'`));
  await shot("2-property-form");
  await click("Create property");
  await waitFor(`document.body.textContent.includes('East-facing plot in Tambaram') && !document.querySelector('.adm-form')`, "back on list");
  check("saved toast", (await toast()).startsWith("Saved. The website updates"), await toast());
  b = await backend();
  const uploads = b.log.filter((l) => l.op === "upload");
  check("4 files uploaded (2 photos × large+small)", uploads.length === 4, uploads.map((u) => `${u.path}:${u.bytes}`).join(" "));
  check("small variants named -sm", uploads.filter((u) => u.path.endsWith("-sm.webp") || u.path.endsWith("-sm.jpg")).length === 2);
  const ins = b.log.find((l) => l.op === "insert" && l.table === "properties")?.rows[0];
  check("insert row fields", ins && ins.title === "East-facing plot in Tambaram" && ins.price === 5200000 && ins.area_sqft === 1200 && ins.facing === "East" && ins.corner_plot === true && ins.stage === "live" && ins.category === "plot" && ins.area_unit === "sqft"
    && ins.slug === "east-facing-plot-in-tambaram-asms-0001" && ins.amenities.join() === "Water supply" && ins.nearby.length === 1 && ins.nearby[0].name === "Tambaram station" && ins.images.length === 2 && !("id" in ins), JSON.stringify(ins)?.slice(0, 300));
  await shot("3-properties-list");

  // 3. duplicate reference is explained
  await click("+ New property");
  await waitFor(`!!document.querySelector('.adm-form')`, "property form 2");
  await fill("Title", "East-facing plot in Tambaram"); await fill("Reference", "ASMS-0001"); await fill("Location", "X");
  await click("Create property");
  await waitFor(`!!document.querySelector('.adm-toast-error')`, "duplicate error");
  check("duplicate explained", (await toast()).includes("already uses"), await toast());
  await click("Cancel");

  // 4. edit: remove one photo → storage cleanup after save
  await waitFor(`!document.querySelector('.adm-form')`, "list again");
  await click("Edit");
  await waitFor(`document.querySelectorAll('.adm-photo-grid figure').length === 2`, "edit form photos");
  const removedPath = ins.images[0].path;
  await js(`document.querySelector('.adm-photo-grid figure button[aria-label="Remove photo"]').click()`);
  await click("Save changes");
  await waitFor(`!document.querySelector('.adm-form')`, "saved edit");
  b = await backend();
  const del = b.log.filter((l) => l.op === "storage-delete").pop();
  check("removed photo deleted from storage (both sizes)", del && del.prefixes.includes(removedPath) && del.prefixes.some((p) => p.includes("-sm.")), JSON.stringify(del));
  check("update sent with 1 image", b.log.filter((l) => l.op === "update" && l.table === "properties").pop()?.change.images.length === 1);

  // 5. pause, then the area-unit conversion and category switch on a new form
  await click("Pause");
  await sleep(500);
  b = await backend();
  check("pause patches stage=paused", JSON.stringify(b.log.filter((l) => l.op === "update").pop()?.change) === '{"stage":"paused"}');
  await click("+ New property");
  await waitFor(`!!document.querySelector('.adm-form')`, "property form 3");
  await fill("Show area in", "acre");
  await fill("Area (acres)", "2.5");
  check("acres stored as sq ft", await js(`document.body.textContent.includes('= 1,08,900 sq ft')`));
  await fill("Category", "residential");
  check("residential shows home fields and subtypes", await js(`document.body.textContent.includes('Home details') && !document.body.textContent.includes('Land details') && [...document.querySelectorAll('select')].some(s => s.value === 'Apartment')`));
  await click("Cancel");
  await waitFor(`!document.querySelector('.adm-form')`, "list after cancel");

  // 6. products: create one
  await click("Products");
  await waitFor(`document.body.textContent.includes('No products in this category')`, "products tab");
  await click("+ New product");
  await waitFor(`!!document.querySelector('.adm-form')`, "product form");
  await fill("Name", "TMT reinforcement bars");
  await fill("Pricing unit", "Per tonne");
  await click("+ Add specification");
  await js(`(() => { const inp = document.querySelectorAll('.adm-row input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    set.call(inp[0], 'Grade'); inp[0].dispatchEvent(new Event('input',{bubbles:true})); set.call(inp[1], 'Fe 500D'); inp[1].dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const doc2 = (await cdp("DOM.getDocument")).result.root;
  const file2 = (await cdp("DOM.querySelector", { nodeId: doc2.nodeId, selector: '.adm-photos input[type="file"]' })).result.nodeId;
  await cdp("DOM.setFileInputFiles", { nodeId: file2, files: [photo] });
  await waitFor(`document.querySelectorAll('.adm-photo-grid figure').length === 1`, "product photo", 15000);
  check("single-photo picker hides add button", await js(`!document.querySelector('.adm-photo-add')`));
  await shot("4-product-form");
  await click("Create product");
  await waitFor(`!document.querySelector('.adm-form') && document.body.textContent.includes('TMT reinforcement bars')`, "product saved");
  b = await backend();
  const pin = b.log.find((l) => l.op === "insert" && l.table === "products")?.rows[0];
  check("product insert fields", pin && pin.slug === "tmt-reinforcement-bars" && pin.category_id === "steel-peb" && pin.specs[0].value === "Fe 500D" && pin.image_path?.startsWith("products/") && pin.published === false, JSON.stringify(pin));

  // 7. staff: add an editor
  await click("Staff");
  await waitFor(`document.body.textContent.includes('Add a staff member')`, "staff tab");
  await fill("Email", "Editor@ASMS.test"); await fill("Name", "Editor One");
  await click("Add to staff");
  await waitFor(`document.body.textContent.includes('editor@asms.test')`, "staff listed");
  b = await backend();
  check("staff email lower-cased", b.log.find((l) => l.op === "insert" && l.table === "staff")?.rows[0].email === "editor@asms.test");
  check("own role/remove disabled", await js(`[...document.querySelectorAll('.adm-staff li')].find(li=>li.textContent.includes('(you)')).querySelector('button').disabled`));
  await shot("5-staff");

  // 8. publish now + sign out
  await click("Update website now");
  await waitFor(`(document.querySelector('.adm-toast span')?.textContent ?? '').startsWith('Website update started')`, "publish toast");
  b = await backend();
  check("publish button calls RPC", b.log.some((l) => l.op === "rpc-rebuild"));
  await click("Sign out");
  await waitFor(`document.querySelector('.adm-card h1')?.textContent === 'Staff sign in'`, "signed out");
  check("sign out returns to sign-in", true);

  // 9. public contact form sends a real enquiry
  await cdp("Page.navigate", { url: `${BASE}/contact?ref=ASMS-0001` });
  await waitFor(`document.getElementById('f-interest')?.value === 'ASMS-0001'`, "contact form prefilled");
  check("form is connected", await js(`document.querySelector('form.enquiry-form').dataset.endpoint === 'http://127.0.0.1:54401/rest/v1/enquiries'`));
  const before = (await backend()).db.enquiries.length;
  await click("Send enquiry");
  await sleep(300);
  check("empty form is not sent", (await backend()).db.enquiries.length === before && await js(`document.querySelector('.form-help[data-tone="error"]') !== null`));
  await fill("Full name", "Meena S"); await fill("Phone number", "+91 98840 55555"); await fill("Email address", "meena@example.com");
  await fill("How can we help?", "Need 2 tonnes of TMT bars.");
  check("category preset from the link", await js(`document.getElementById('f-category').value === 'Property purchase'`));
  await js(`document.querySelector('.consent input').click()`);
  await click("Send enquiry");
  await waitFor(`!!document.querySelector('.enquiry-sent')`, "thank-you message");
  check("thank-you names the visitor and phone", (await js(`document.querySelector('.enquiry-sent').textContent`)).includes("Thank you, Meena S.") && (await js(`document.querySelector('.enquiry-sent').textContent`)).includes("reached our team") && (await js(`document.querySelector('.enquiry-sent').textContent`)).includes("+91 98840 55555"));
  b = await backend();
  const sent = b.log.filter((l) => l.op === "insert" && l.table === "enquiries").pop();
  check("enquiry sent with form fields only", sent && JSON.stringify(Object.keys(sent.rows[0]).sort()) === JSON.stringify(["consent", "email", "interest", "kind", "message", "name", "phone", "property_ref", "source"])
    && sent.rows[0].consent === true && sent.rows[0].kind === "property" && sent.rows[0].property_ref === "ASMS-0001" && sent.rows[0].source === "contact_page" && sent.apikey === "anon-test" && sent.prefer === "return=minimal", JSON.stringify(sent));
  await shot("7-enquiry-sent");

  // 9b. property page: view counted after 3 s, visit request, WhatsApp click, share
  await js(`localStorage.removeItem('asms-staff')`);
  await cdp("Browser.grantPermissions", { origin: BASE, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
  await cdp("Page.navigate", { url: `${BASE}/properties/residential-plot-opportunity` });
  await waitFor(`!!document.querySelector('.rail-form')`, "enquiry rail");
  await sleep(3600);
  b = await backend();
  check("view counted after 3 seconds", b.log.some((l) => l.op === "track" && l.event_type === "property_view" && l.property_ref === "ASMS-PREVIEW-01" && /^[0-9a-f-]{36}$/.test(l.visitor)));
  await click("Request a visit");
  await fill("Full name", "Karthik R"); await fill("Phone or WhatsApp number", "9884022222");
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-CA");
  await fill("Preferred day", tomorrow); await fill("Time of day", "Morning");
  await js(`document.querySelector('.rail-form .consent input').click()`);
  await click("Send visit request");
  await waitFor(`!!document.querySelector('.rail-sent')`, "visit request sent");
  check("visit confirmation says request, not booking", (await js(`document.querySelector('.rail-sent').textContent`)).includes("This is a request, not a booking"));
  b = await backend();
  const visit = b.log.filter((l) => l.op === "insert" && l.table === "enquiries").pop()?.rows[0];
  check("visit request sent with property and preference", visit && visit.kind === "visit" && visit.source === "property_page" && visit.property_ref === "ASMS-PREVIEW-01" && visit.preferred_date === tomorrow && visit.preferred_time === "Morning" && !("message" in visit), JSON.stringify(visit));
  check("visit lands in the inbox as Visit requested", b.db.enquiries.find((e) => e.name === "Karthik R")?.status === "visit_requested");
  await js(`(() => { const a = [...document.querySelectorAll('.rail-secondary a')].find(x => x.textContent === 'WhatsApp us'); a.addEventListener('click', (e) => e.preventDefault()); a.click(); window.__wa = a.href; })()`);
  await sleep(400);
  b = await backend();
  check("WhatsApp click tracked separately from enquiries", b.log.some((l) => l.op === "track" && l.event_type === "whatsapp_click") && (await js(`window.__wa`)).startsWith("https://wa.me/919800000000?text=Hello"));
  await cdp("Emulation.setFocusEmulationEnabled", { enabled: true });  // the clipboard needs a focused page
  await js(`Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })`);  // test the copy-link path
  await click("Share this property");
  await waitFor(`document.querySelector('.share-link')?.textContent === 'Link copied'`, "link copied");
  b = await backend();
  check("share tracked", b.log.some((l) => l.op === "track" && l.event_type === "property_shared"));
  await cdp("Page.navigate", { url: `${BASE}/properties/sold-plot-sample` });
  await sleep(4000);
  b = await backend();
  check("sold page: no enquiry form, no view counted", !(await js(`!!document.querySelector('.rail-form')`)) && !b.log.some((l) => l.op === "track" && l.property_ref === "ASMS-PREVIEW-07"));

  // 10. mobile layout of the list
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp("Page.navigate", { url: `${BASE}/admin` });
  await waitFor(`document.querySelector('.adm-card h1')?.textContent === 'Staff sign in'`, "sign-in again");
  await fill("Email", "owner@asms.test"); await fill("Password", "correct-horse"); await click("Sign in");
  await waitFor(`!!document.querySelector('.adm-header')`, "mobile header");
  await waitFor(`!!document.querySelector('.adm-enquiries li')`, "mobile inbox");
  check("no horizontal overflow on phone", await js(`document.documentElement.scrollWidth <= 390`), String(await js(`document.documentElement.scrollWidth`)));
  await shot("6-mobile");
} catch (e) {
  check("driver crashed", false, e.message);
} finally {
  console.log(results.join("\n"));
  chrome.kill();
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
