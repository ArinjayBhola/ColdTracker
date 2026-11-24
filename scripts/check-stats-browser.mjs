// Run against the local dev server. All database writes belong to a disposable account.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.STATS_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const owner = `stats-browser-test-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-stats-test-"));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket, send, evaluate;
let statsRequests = 0;
const browserErrors = [];
async function waitFor(check, label, timeout = 60000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    if (await check()) return;
    await pause(250);
  }
  throw new Error(`Timed out: ${label}`);
}
async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(tmpdir(), `coldtrack-stats-${name}.png`), Buffer.from(result.data, "base64"));
}
try {
  await sql`INSERT INTO public."user" (id, email) VALUES (${owner}, ${owner + "@example.invalid"})`;
  for (let index = 0; index < 24; index++) {
    const sentAt = new Date(Date.now() - (index % 20) * 86400000).toISOString();
    const status = ["SENT", "REPLIED", "INTERVIEW", "OFFER", "GHOSTED", "DRAFT", "REJECTED", "CLOSED"][index % 8];
    const contacts = [{ personName: "Example Contact", contactMethod: index % 2 ? "EMAIL" : "LINKEDIN", messageSentAt: sentAt }];
    await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, contacts, status, created_at)
      VALUES (${owner}, ${`Example ${index}`}, 'Designer', ${sql.json(contacts)}, ${status}, ${sentAt})`;
  }
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  let port;
  await waitFor(async () => {
    try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return !!port; } catch { return false; }
  }, "Chrome debugging port");
  const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Network.requestWillBeSent" && new URL(message.params.request.url).pathname === "/api/stats") statsRequests++;
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") browserErrors.push(message.params.args.map(arg => arg.value || arg.description || "").join(" "));
    if (!message.id) return;
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  };
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  await send("Network.enable");
  await send("Runtime.enable");
  const cookieName = "authjs.session-token";
  const token = await encode({ token: { sub: owner }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: cookieName, maxAge: 600 });
  await send("Network.setCookie", { name: cookieName, value: token, url: base, httpOnly: true, sameSite: "Lax" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/stats` });
  await waitFor(() => evaluate(`!!document.querySelector('[aria-label="Summary metrics"]')`), "statistics load");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Summary metrics"]').innerText.includes('21')`), true, "drafts excluded");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Response rate').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('svg[aria-label="Recorded response rate by sent date"]')`), "response rate chart");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Counts').click()`);
  await screenshot("desktop");
  // Capture export contents without writing a download outside the browser profile.
  await evaluate(`window.statsBlob=null; window.statsCreateURL=URL.createObjectURL; URL.createObjectURL=(blob)=>{window.statsBlob=blob;return window.statsCreateURL(blob)}; Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Export CSV')).click()`);
  assert.match(await evaluate(`window.statsBlob.text()`), /"Sent","21"/, "CSV retains real totals");
  await pause(500);
  const beforeRange = statsRequests;
  for (const label of ["Last 7 days", "Last 90 days", "All time", "Last 30 days"]) {
    await evaluate(`document.querySelector('[aria-label="Statistics date range"]').click()`);
    await waitFor(() => evaluate(`!!document.querySelector('[role="option"]')`), "range options");
    await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(option=>option.textContent===${JSON.stringify(label)}).click()`);
    await waitFor(() => evaluate(`document.querySelector('[aria-label="Statistics date range"]').textContent===${JSON.stringify(label)}`), "range updates locally");
  }
  assert.equal(statsRequests, beforeRange, "changing date ranges makes no API requests");
  const [navigationFixture] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, status, contacts)
    VALUES (${owner}, 'Navigation freshness fixture', 'Designer', 'SENT', ${sql.json([{ personName: "Navigation", contactMethod: "EMAIL", messageSentAt: new Date().toISOString() }])}) RETURNING id`;
  await waitFor(() => evaluate(`document.readyState === 'complete' && !!document.querySelector('a[href="/settings?tab=statistics"]')`), "Stats navigation is ready");
  await evaluate(`document.querySelector('a[href="/settings?tab=statistics"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('#stats-range')`), "settings before returning to Stats");
  const beforeReturn = statsRequests;
  await evaluate(`document.querySelector('a[href="/stats"]').click()`);
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Summary metrics"]')?.innerText.includes('22')`), "new server snapshot replaces cached Stats on navigation");
  await pause(300);
  assert.equal(statsRequests, beforeReturn, "fresh server snapshots avoid duplicate API reads");
  await sql`DELETE FROM public.outreach WHERE id = ${navigationFixture.id} AND "userId" = ${owner}`;
  await send("Page.navigate", { url: `${base}/stats` });
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Summary metrics"]')?.innerText.includes('21')`), "navigation fixture removed");
  for (const width of [390, 768]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
    await pause(400);
    assert.equal(await evaluate(`document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth`), true, `no page overflow at ${width}px`);
  }
  await screenshot("tablet");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.documentElement.classList.add('dark'); document.documentElement.dataset.theme='teal'; document.documentElement.style.setProperty('--app-text-size','24px')`);
  await pause(400); // Let theme color transitions finish before the visual capture.
  assert.equal(await evaluate(`document.querySelector('main').scrollWidth <= document.querySelector('main').clientWidth`), true, "large text has no page overflow");
  await screenshot("mobile-dark-large-text");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  const futureSentAt = new Date(Date.now() + 6000).toISOString();
  const [future] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, status, contacts)
    VALUES (${owner}, 'Future synthetic outreach', 'Designer', 'SENT', ${sql.json([{ personName: "Future", contactMethod: "EMAIL", messageSentAt: futureSentAt }])}) RETURNING id`;
  await send("Page.navigate", { url: `${base}/stats` });
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Summary metrics"]')?.innerText.includes('21')`), "future sends start excluded");
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Summary metrics"]')?.innerText.includes('22')`), "future send becomes current automatically", 15000);
  await sql`DELETE FROM public.outreach WHERE id = ${future.id} AND "userId" = ${owner}`;
  await send("Page.navigate", { url: `${base}/stats` });
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Summary metrics"]')?.innerText.includes('21')`), "future fixture removed");
  await waitFor(() => evaluate(`document.readyState === 'complete' && !!document.querySelector('a[href="/settings?tab=statistics"]')`), "Stats reload completes before Settings navigation");
  await evaluate(`document.querySelector('a[href="/settings?tab=statistics"]').click()`);
  await waitFor(() => evaluate(`document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Statistics' && !!document.querySelector('#stats-range')`), "customize opens Statistics settings");
  await evaluate(`Array.from(document.querySelectorAll('label')).find(l=>l.textContent.includes('Summary metrics')).querySelector('input').click()`);
  await waitFor(() => evaluate(`!document.querySelector('[role="tabpanel"]:not([hidden])').innerText.includes('Saving...')`), "widget preference saved");
  await evaluate(`document.getElementById('stats-range').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('[role="option"]')`), "date range options");
  await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(o=>o.textContent==='Last 7 days').click()`);
  await waitFor(async () => {
    const [row] = await sql`SELECT preferences FROM public."user" WHERE id=${owner}`;
    return row.preferences?.stats?.range === "7" && !row.preferences.stats.widgets.includes("metrics");
  }, "settings persisted");
  await evaluate(`document.getElementById('stats-week').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('[role="option"]')`), "week start options");
  await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(o=>o.textContent==='Sunday').click()`);
  await waitFor(async () => {
    const [row] = await sql`SELECT preferences FROM public."user" WHERE id=${owner}`;
    return row.preferences?.stats?.weekStartsOn === 0;
  }, "week start persisted");
  await send("Page.navigate", { url: `${base}/stats#goals` });
  await waitFor(() => evaluate(`!!document.querySelector('[aria-label="Statistics date range"]') && !!document.querySelector('svg')`), "stats reload with preferences");
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="Summary metrics"]')`), false, "hidden widget respected");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Statistics date range"]').textContent`), "Last 7 days", "saved default range respected");
  assert.equal(await evaluate(`document.querySelector('[aria-label="Scrollable yearly outreach activity calendar"]').innerText.includes('Sun') && !document.querySelector('[aria-label="Scrollable yearly outreach activity calendar"]').innerText.includes('Mon')`), true, "heatmap follows saved week start");
  await waitFor(() => evaluate(`document.getElementById('goals').getBoundingClientRect().top < innerHeight`), "goals anchor");
  assert.deepEqual(browserErrors, [], "Stats must not cause hydration or runtime errors");
  console.log("Aggregate Stats checks passed: instant local ranges, future-send refresh, and no browser/hydration errors.");
  console.log("Stats browser checks passed: charts, CSV, responsive layout, dark mode, large text, Settings navigation, widget visibility, saved date range, heatmap week start, goals anchor.");
  console.log(`Screenshots saved in ${tmpdir()} as coldtrack-stats-*.png`);
} catch (error) {
  if (evaluate && send) {
    console.log("Browser state:", await evaluate(`document.body.innerText.slice(-2000)`));
    await screenshot("failure");
  }
  throw error;
} finally {
  socket?.close();
  if (chrome) { chrome.kill(); await pause(1000); }
  await sql`DELETE FROM public."user" WHERE id=${owner}`;
  await sql.end();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-stats-test-")) {
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
}
