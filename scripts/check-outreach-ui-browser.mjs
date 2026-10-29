// Visual regression checks with a disposable account and headless Chrome.
// No real accounts are changed and no emails are sent.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = "http://localhost:3000";
const owner = `outreach-ui-check-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-outreach-ui-"));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket, send, evaluate;
async function waitFor(check, label, timeout = 60000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await check()) return; await pause(200); }
  throw new Error(`Timed out: ${label}`);
}
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(tmpdir(), `coldtrack-outreach-ui-${name}.png`), Buffer.from(result.data, "base64"));
}
async function assertFits(label) {
  const result = await evaluate(`(() => {
    const main = document.querySelector('main');
    const offscreen = [...document.querySelectorAll('[data-follow-up-row] button, [data-follow-up-row] a')].filter(element => {
      const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 1 || rect.left < 0;
    }).map(element => element.textContent);
    return { overflow: main.scrollWidth - main.clientWidth, offscreen };
  })()`);
  assert.ok(result.overflow <= 1, `${label}: page overflow ${result.overflow}px`);
  assert.deepEqual(result.offscreen, [], `${label}: all row actions visible`);
}

try {
  await sql`INSERT INTO public."user" (id, email, time_zone, receive_notifications, preferences)
    VALUES (${owner}, ${`${owner}@example.invalid`}, 'Asia/Kolkata', false,
      ${sql.json({ appearance: { colorTheme: "default", font: "kalam", fontWeight: 700, fontSize: 24, reducedMotion: true }, mode: "light" })})`;
  const due = new Date(Date.now() + 3 * 86400000).toISOString();
  const at = "2026-10-10T10:30:00.000Z";
  const contacts = [
    { id: randomUUID(), personName: "Stawan Kamani", personRole: "CEO", contactMethod: "EMAIL", emailAddress: "stawan@example.invalid", messageSentAt: at, followUpDueAt: due,
      followUpHistory: [{ stage: 1, action: "sent", at, date: at }, { stage: 1, action: "reverted", at: "2026-10-11T10:35:00Z", date: null }] },
    { id: randomUUID(), personName: "Kartik Daswani", personRole: "Associate recruiter with a longer position title", contactMethod: "EMAIL", emailAddress: "kartik@example.invalid", messageSentAt: at, followUpDueAt: due },
    { id: randomUUID(), personName: "Gosiya Shaikh", personRole: "HR", contactMethod: "LINKEDIN", linkedinProfileUrl: "https://www.linkedin.com/in/example", messageSentAt: at, followUpDueAt: due },
  ];
  const [record] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, status, contacts, application_source, application_status, application_url, status_history)
    VALUES (${owner}, 'Strategy & Transformation Consulting (s&t)',
      'Strategy & Transformation Consulting (s&t) | Head of Development – AI Agent Platform | REMOTE (Germany) | Full-time | German C1+ and a very long role title',
      'SENT', ${sql.json(contacts)}, 'COMPANY_WEBSITE', 'APPLIED', 'https://example.invalid/application',
      ${sql.json([{ status: "SENT", at, source: "baseline" }])}) RETURNING id`;
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let port;
  await waitFor(async () => { try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return !!port; } catch { return false; } }, "Chrome startup");
  const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  };
  send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send("Network.enable");
  const cookieName = "authjs.session-token";
  const token = await encode({ token: { sub: owner }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: cookieName, maxAge: 600 });
  await send("Network.setCookie", { name: cookieName, value: token, url: base, httpOnly: true, sameSite: "Lax" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/follow-ups` });
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length === 3`), "contact queue");
  for (const width of [1440, 1024, 768, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 500 });
    await pause(300);
    await assertFits(`queue at ${width}px`);
    await screenshot(`queue-${width}`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/outreach/${record.id}` });
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Select contact"]')`), "contact selector");
  assert.equal(await evaluate(`document.querySelector('main').innerText.includes('Company Contacts')`), false, "sidebar contacts card removed");
  assert.equal(await evaluate(`document.querySelector('main').innerText.includes('10 October 2026')`), true, "long date format");
  assert.equal(await evaluate(`document.querySelector('main').innerText.includes('10/10/2026')`), false, "no numeric history dates");
  await evaluate(`document.querySelector('button[aria-label="Select contact"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('ul[aria-label="Company contacts"]')`), "contact dropdown");
  assert.equal(await evaluate(`document.querySelector('ul[aria-label="Company contacts"]').querySelectorAll('a').length`), 0, "contact dropdown has no redirect links");
  assert.ok(await evaluate(`document.querySelector('ul[aria-label="Company contacts"]').getBoundingClientRect().width <= 320`), "compact contact dropdown");
  await screenshot("contact-selector");
  await evaluate(`Array.from(document.querySelectorAll('ul[aria-label="Company contacts"] button')).find(button => button.textContent.includes('Kartik Daswani')).click()`);
  await waitFor(() => evaluate(`document.querySelector('button[aria-label="Select contact"]').textContent.includes('Kartik Daswani')`), "contact switched");
  assert.equal(await evaluate(`document.querySelector('main').innerText.includes('kartik@example.invalid')`), true, "details follow selected person");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('More details')).click()`);
  await waitFor(() => evaluate(`!!document.querySelector('a[href="https://example.invalid/application"]')`), "application link");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Edit details')).click()`);
  await waitFor(() => evaluate(`!!document.querySelector('input[aria-label="Application link"]')`), "edit application fields");
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Application link"]').value`), "https://example.invalid/application");
  // Leave edit mode without writing any changes.
  await send("Page.navigate", { url: `${base}/outreach/${record.id}` });
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Select contact"]')`), "detail reload");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('More details')).click()`);
  for (const width of [1440, 768, 390]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 500 });
    await pause(300);
    await assertFits(`details at ${width}px`);
    assert.equal(await evaluate(`(() => {
      const buttons = [document.querySelector('[aria-label="Refresh data"]'), document.querySelector('button[title="Notifications"]'), document.querySelector('[aria-label="Show your keyboard shortcuts"]')];
      if (buttons.some(button => !button)) return false;
      const boxes = buttons.map(button => button.getBoundingClientRect());
      return boxes.every(box => Math.abs(box.top - boxes[0].top) < 1) && boxes[0].right < boxes[1].left && boxes[1].right < boxes[2].left;
    })()`), true, `header icons aligned at ${width}px`);
    await screenshot(`details-${width}`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('[data-outreach-history]').scrollIntoView({ block: 'start' })`);
  await pause(300);
  await screenshot("history");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Mark follow-up 1 sent for all')).click()`);
  await waitFor(async () => {
    const [row] = await sql`SELECT contacts FROM public.outreach WHERE id = ${record.id}`;
    return row.contacts.every(contact => !!contact.followUpSentAt && !contact.followUp2SentAt);
  }, "bulk stage 1 saved for every contact");
  await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.includes('Mark follow-up 2 sent for all'))`), "bulk button advances to stage 2");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Mark follow-up 2 sent for all')).click()`);
  await waitFor(async () => {
    const [row] = await sql`SELECT contacts FROM public.outreach WHERE id = ${record.id}`;
    return row.contacts.every(contact => !!contact.followUp2SentAt);
  }, "bulk stage 2 saved for every contact");
  await waitFor(() => evaluate(`Array.from(document.querySelectorAll('button')).some(button => button.textContent.includes('All contacts completed') && button.disabled)`), "completed bulk button disabled");
  const [single] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, status, contacts)
    VALUES (${owner}, 'Single contact example', 'Engineer', 'SENT', ${sql.json([contacts[0]])}) RETURNING id`;
  await send("Page.navigate", { url: `${base}/outreach/${single.id}` });
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Select contact"]')`), "single-contact detail");
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).some(button => /sent for all|All contacts completed/.test(button.textContent))`), false, "bulk control hidden for one contact");
  console.log("Passed: long-role queue actions stay visible at 390–1440px with 24px Kalam; header contact selection; More details and editable application link; readable history dates.");
  console.log(`Screenshots: ${path.join(tmpdir(), "coldtrack-outreach-ui-*.png")}`);
} catch (error) {
  if (evaluate && send) { console.log("Browser state:", await evaluate(`document.body.innerText.slice(-1800)`)); await screenshot("failure"); }
  throw error;
} finally {
  socket?.close();
  if (chrome) { chrome.kill(); await pause(500); }
  await sql`DELETE FROM public."user" WHERE id = ${owner}`;
  await sql.end();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-outreach-ui-")) {
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
