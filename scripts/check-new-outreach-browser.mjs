// Uses a disposable account; requires the local app and Chrome.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const owner = `new-outreach-check-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-new-outreach-"));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket, evaluate;
async function waitFor(check, label) {
  const until = Date.now() + 60000;
  while (Date.now() < until) { if (await check()) return; await pause(200); }
  throw new Error(`Timed out: ${label}`);
}
try {
  await sql`INSERT INTO public."user" (id, email, time_zone, receive_notifications) VALUES (${owner}, ${owner + "@example.invalid"}, 'Asia/Kolkata', false)`;
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "about:blank",
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
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const cookieName = "authjs.session-token";
  const token = await encode({ token: { sub: owner }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: cookieName, maxAge: 600 });
  await send("Network.setCookie", { name: cookieName, value: token, url: base, httpOnly: true, sameSite: "Lax" });
  await send("Page.navigate", { url: `${base}/outreach/new` });
  await waitFor(() => evaluate(`!!document.querySelector('input[name="companyName"]') && document.cookie.includes('coldtrack-time-zone')`), "new outreach form");
  // Wait for React hydration by toggling the details panel.
  await waitFor(() => evaluate(`(() => { if (document.querySelector('input[name="companyLink"]')) return true; [...document.querySelectorAll('button')].find(b => b.textContent.includes('More details')).click(); return false; })()`), "hydration");
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Hide details')).click()`);
  const setInput = async (name, value) => evaluate(`(() => { const input = document.getElementsByName(${JSON.stringify(name)})[0]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await setInput("companyName", "Save another example");
  await evaluate(`document.querySelector('button[value="another"]').click()`);
  await waitFor(async () => { const [row] = await sql`SELECT count(*)::int AS count FROM public.outreach WHERE "userId" = ${owner}`; return row.count === 1; }, "first outreach saved");
  await waitFor(() => evaluate(`document.querySelector('input[name="companyName"]')?.value === '' && !document.querySelector('button[value="another"]').disabled`), "form resets after save");
  assert.equal(await evaluate(`location.pathname`), "/outreach/new");
  await waitFor(() => evaluate(`document.querySelector('p[role="status"] a')?.getAttribute('href')?.startsWith('/outreach/')`), "saved outreach link remains visible after reset");
  await setInput("companyName", "Second outreach example");
  await setInput("roleTargeted", "Engineer");
  await evaluate(`document.querySelector('input[type="checkbox"]').click()`);
  await evaluate(`document.querySelector('button[value="another"]').click()`);
  await waitFor(async () => { const [row] = await sql`SELECT count(*)::int AS count FROM public.outreach WHERE "userId" = ${owner}`; return row.count === 2; }, "second outreach saved");
  await waitFor(() => evaluate(`document.querySelector('input[name="companyName"]')?.value === 'Second outreach example' && !document.querySelector('button[value="another"]').disabled`), "company retained");
  assert.equal(await evaluate(`document.querySelector('input[name="roleTargeted"]').value`), "Engineer");
  await setInput("contacts.0.personName", "Another contact");
  await evaluate(`document.querySelector('button[value="another"]').click()`);
  await waitFor(async () => {
    const rows = await sql`SELECT contacts FROM public.outreach WHERE "userId" = ${owner} AND company_name = 'Second outreach example'`;
    return rows.length === 1 && rows[0].contacts.length === 2;
  }, "same-company contact saved to existing outreach");
  await waitFor(() => evaluate(`document.querySelector('p[role="status"]')?.textContent.includes('Contacts added to the existing company outreach.') && !document.querySelector('button[value="another"]').disabled`), "merge confirmation visible");
  await setInput("companyName", "Regular save example");
  await evaluate(`document.querySelector('button[value="save"]').click()`);
  await waitFor(() => evaluate(`location.pathname.startsWith('/outreach/') && location.pathname !== '/outreach/new'`), "regular save navigates to outreach");
  const rows = await sql`SELECT company_name, contacts FROM public.outreach WHERE "userId" = ${owner}`;
  assert.equal(rows.length, 3);
  assert.ok(rows.every(row => row.contacts[0].messageSentAt && row.contacts[0].followUpDueAt));
  await send("Page.navigate", { url: `${base}/dashboard` });
  await waitFor(() => evaluate(`document.body?.innerText.includes('Save another example') && document.body?.innerText.includes('Second outreach example') && document.body?.innerText.includes('Regular save example')`), "saved entries visible in dashboard");
  console.log("Passed: repeated saves persist entries and reset the form; saved links remain visible; same-company saves append contacts and explain the merge; regular save navigates; entries appear in dashboard.");
} catch (error) {
  if (evaluate) console.error("Browser state:", await evaluate(`document.body?.innerText.slice(-2500)`).catch(() => "unavailable"));
  throw error;
} finally {
  socket?.close();
  if (chrome) { chrome.kill(); await pause(500); }
  await sql`DELETE FROM public."user" WHERE id = ${owner}`;
  await sql.end();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-new-outreach-")) await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
