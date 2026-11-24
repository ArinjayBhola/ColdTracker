// Local Chrome smoke test. Uses a temporary browser profile and a synthetic
// account, then removes both. Requires the local dev server and Windows Chrome.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.NOTIFICATION_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const owner = `notification-browser-test-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-notification-test-"));
let chrome;
let socket;
let send;
let evaluate;
const notificationRequests = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(check, label, timeout = 45000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const result = await check();
    if (result) return result;
    await pause(200);
  }
  throw new Error(`Timed out: ${label}`);
}
try {
  await sql`INSERT INTO public."user" (id, email) VALUES (${owner}, ${owner + "@example.invalid"})`;
  const [outreach] = await sql`INSERT INTO public.outreach ("userId", company_name, role_targeted, contacts)
    VALUES (${owner}, 'Example Company', 'Designer', ${sql.json([{ personName: "Alex Morgan", personRole: "Recruiter", contactMethod: "EMAIL", emailAddress: "alex@example.invalid" }])}) RETURNING id`;
  const [message] = await sql`INSERT INTO public.outreach_email_messages
    (user_id, outreach_id, attempt_id, sender_hash, recipient, subject, kind, token_hash, delivery_state, provider_id, sent_at)
    VALUES (${owner}, ${outreach.id}, ${randomBytes(16).toString("hex")}, ${randomBytes(32).toString("hex")},
    'alex@example.invalid', 'Design opportunity', 'initial', ${randomBytes(32).toString("hex")}, 'accepted', 'test-provider', now()) RETURNING id`;
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank",
  ], { windowsHide: true, stdio: "ignore" });
  const port = await waitFor(async () => {
    try { return Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); } catch { return false; }
  }, "Chrome debugging port");
  const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Network.requestWillBeSent" && new URL(message.params.request.url).pathname === "/api/notifications") {
      notificationRequests.push({ url: message.params.request.url, method: message.params.request.method });
    }
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
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  await send("Network.enable");
  const cookieName = "authjs.session-token";
  const token = await encode({ token: { sub: owner }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: cookieName, maxAge: 600 });
  await send("Network.setCookie", { name: cookieName, value: token, url: base, httpOnly: true, sameSite: "Lax" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/outreach/new` });
  await waitFor(() => evaluate(`!!document.querySelector('button[title="Notifications"]')`), "global bell");
  await waitFor(() => evaluate(`(()=>{if(document.querySelector('[role="dialog"]'))return true;document.querySelector('button[title="Notifications"]').click();return false})()`), "hydrated inbox opens");
  await waitFor(() => evaluate(`document.body.innerText.includes('No notifications yet')`), "empty inbox");

  await sql`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${randomUUID()}, ${message.id})`;
  await waitFor(() => evaluate(`document.body.innerText.includes('Open detected for Alex Morgan')`), "live event without reload", 15000);
  await waitFor(() => evaluate(`!!document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]')`), "clickable live toast", 15000);
  assert.equal(await evaluate(`(()=>{const t=document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]').closest('li').getBoundingClientRect();return t.top>innerHeight/2 && t.left>innerWidth/2})()`), true, "toast appears in the bottom right");
  await evaluate(`document.querySelector('button[aria-label="Dismiss notification"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[role="dialog"] time') === null`), true, "cards omit dates/times");
  await evaluate(`document.querySelector('button[aria-label="Mark read: Alex Morgan"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Mark unread: Alex Morgan"]:not(:disabled)')`), "mark read");
  await pause(550);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[role="dialog"] li')).backgroundColor`), "rgba(0, 0, 0, 0)", "read background fades away");
  await evaluate(`document.querySelector('button[aria-label="Mark unread: Alex Morgan"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Mark read: Alex Morgan"]:not(:disabled)')`), "mark unread");
  await pause(550);
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('[role="dialog"] li')).backgroundColor`), "rgba(0, 0, 0, 0)", "unread background returns");
  const desktop = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(tmpdir(), "coldtrack-notifications-desktop.png"), Buffer.from(desktop.data, "base64"));
  await evaluate(`document.querySelector('[role="dialog"] a[href*="/outreach/"]').click()`);
  await waitFor(() => evaluate(`location.pathname === '/outreach/${outreach.id}' && location.hash === '#email-activity'`), "notification navigation");
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"]')`), "inbox closes on navigation");
  await waitFor(() => evaluate(`!!document.getElementById('email-activity')`), "outreach activity section loads");
  await evaluate(`document.querySelector('button[title="Notifications"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Mark unread: Alex Morgan"]:not(:disabled)')`), "click marks notification read");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(500);
  assert.equal(await evaluate(`(()=>{const r=document.querySelector('[role="dialog"]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`), true, "mobile inbox stays within the viewport");
  const mobile = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(tmpdir(), "coldtrack-notifications-mobile.png"), Buffer.from(mobile.data, "base64"));
  await evaluate(`document.querySelector('button[aria-label="Clear notification: Alex Morgan"]').click()`);
  await waitFor(() => evaluate(`document.body.innerText.includes('No notifications yet')`), "clear individual notification");
  await evaluate(`document.querySelector('button[title="Notifications"]').click();document.querySelector('a[href="/outreach/new"]').click()`);
  await waitFor(() => evaluate(`location.pathname === '/outreach/new'`), "navigate away before toast check");
  await sql`INSERT INTO public.outreach_email_open_events (id, message_id) VALUES (${randomUUID()}, ${message.id})`;
  await waitFor(() => evaluate(`!!document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]')`), "second live toast", 15000);
  await evaluate(`document.querySelector('button[title="Notifications"]').click()`);
  await evaluate(`document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]').click()`);
  await waitFor(() => evaluate(`!document.querySelector('[role="dialog"]') && !document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]')`), "toast click dismisses toast and closes inbox");
  assert.equal(await evaluate(`location.pathname === '/outreach/${outreach.id}' && location.hash === '#email-activity'`), true, "toast links to its outreach");
  await evaluate(`document.querySelector('button[title="Notifications"]').click()`);
  await waitFor(() => evaluate(`!!document.querySelector('button[aria-label="Mark unread: Alex Morgan"]:not(:disabled)')`), "toast click marks notification read");
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Clear all')).click()`);
  await waitFor(() => evaluate(`document.body.innerText.includes('No notifications yet')`), "clear all notifications");
  await pause(5500);
  assert.equal(await evaluate(`!!document.querySelector('a[aria-label="Open detected for Alex Morgan. Open outreach"]')`), false, "polling does not repeat old toasts");
  // Populate enough history to expose infinite-query refetch amplification.
  await sql`INSERT INTO public.notifications (id, user_id, outreach_id, recipient, subject, observed_at, created_at)
    SELECT gen_random_uuid(), ${owner}, ${outreach.id}, 'alex@example.invalid', 'Polling history check', now(),
      now() - g * interval '1 second' FROM generate_series(1,95) g`;
  await waitFor(() => evaluate(`document.querySelector('[role="dialog"] ul')?.children.length === 30`), "history arrives");
  for (const expected of [60, 90]) {
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Load older notifications')?.click()`);
    await waitFor(() => evaluate(`document.querySelector('[role="dialog"] ul')?.children.length === ${expected}`), `load ${expected} notifications`);
  }
  await pause(1500);
  notificationRequests.length = 0;
  await pause(11500);
  const steady = notificationRequests.filter(request => request.method === "GET");
  assert.ok(steady.length >= 1, "revision polling continues");
  assert.ok(steady.every(request => new URL(request.url).searchParams.get("summary") === "1"), "unchanged polling never reloads head or history pages");
  assert.ok(steady.length <= 4, "poll frequency does not grow with loaded pages");
  assert.equal(await evaluate(`document.querySelector('[role="dialog"] ul')?.children.length`), 90, "polls preserve loaded history");
  const [oldest] = await sql`SELECT id FROM public.notifications WHERE user_id = ${owner} AND cleared_at IS NULL ORDER BY created_at DESC, id DESC OFFSET 89 LIMIT 1`;
  await sql`UPDATE public.notifications SET read_at = now() WHERE id = ${oldest.id}`;
  await waitFor(() => evaluate(`document.querySelector('[role="dialog"] ul li:last-child button[aria-label="Mark unread: Alex Morgan"]') !== null`), "remote read on page three syncs", 20000);
  await sql`UPDATE public.notifications SET cleared_at = now(), read_at = now() WHERE id = ${oldest.id}`;
  // A cleared row is replaced by the next history entry when loaded pages refresh.
  await waitFor(() => evaluate(`document.querySelector('[role="dialog"] ul li:last-child button[aria-label="Mark read: Alex Morgan"]') !== null`), "remote clear on page three syncs", 20000);
  console.log(JSON.stringify({ loadedPages: 3, unchangedWindowSeconds: 11.5, revisionRequests: steady.length, historyRequests: steady.filter(request => !new URL(request.url).searchParams.has("summary")).length }));
  console.log("Browser checks passed: live toast, read/unread fade, inbox/toast navigation, automatic closing, clearing, and mobile layout.");
  console.log(`Screenshots: ${path.join(tmpdir(), "coldtrack-notifications-desktop.png")} and ${path.join(tmpdir(), "coldtrack-notifications-mobile.png")}`);
} catch (error) {
  if (evaluate && send) {
    console.log("Browser failure state:", await evaluate(`document.body.innerText.slice(-2500)`));
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(tmpdir(), "coldtrack-notifications-failure.png"), Buffer.from(screenshot.data, "base64"));
  }
  throw error;
} finally {
  socket?.close();
  if (chrome) {
    chrome.kill();
    await pause(1000);
  }
  await sql`DELETE FROM public."user" WHERE id = ${owner}`;
  await sql.end();
  // Only remove the exact temporary profile created by this run.
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-notification-test-")) {
    await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  }
  console.log("Synthetic browser account and temporary profile removed.");
}
