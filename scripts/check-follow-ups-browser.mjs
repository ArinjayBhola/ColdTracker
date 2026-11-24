// Local Chrome regression with a disposable queue, removed in finally. No emails.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";
import createLoader from "./reliability-test-loader.cjs";

const base = process.env.FOLLOW_UP_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const owner = `follow-up-browser-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-follow-up-test-"));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let chrome, socket, evaluate;
const requests = [], errors = [];
async function waitFor(check, label, timeout = 30000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await check()) return; await pause(100); }
  throw new Error(`Timed out: ${label}`);
}
try {
  const day = createLoader()("lib/user-calendar.ts").userDayBounds("Asia/Calcutta");
  await sql`INSERT INTO public."user" (id,email,receive_notifications) VALUES (${owner},${owner+"@example.invalid"},false)`;
  await sql`INSERT INTO public.outreach ("userId",company_name,role_targeted,status,contacts)
    SELECT ${owner},'Queue company '||g,'Engineer',(CASE WHEN g=120 THEN 'GHOSTED' ELSE 'SENT' END)::public.status,
      jsonb_build_array(jsonb_build_object('id',md5(g::text),'personName',CASE WHEN g=120 THEN 'Needle Contact' ELSE 'Regular Contact' END,
        'contactMethod',CASE WHEN g=120 THEN 'LINKEDIN' ELSE 'EMAIL' END,
        'followUpDueAt',to_char(${day.start.toISOString()}::timestamptz - interval '1 day' + g*interval '1 second','YYYY-MM-DD"T"HH24:MI:SS"Z"')))
    FROM generate_series(1,150)g`;
  chrome = spawn(process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "about:blank"], { windowsHide: true, stdio: "ignore" });
  let port;
  await waitFor(async () => { try { port = Number((await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); return !!port; } catch { return false; } }, "Chrome starts");
  const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === "Network.requestWillBeSent" && new URL(message.params.request.url).pathname === "/api/follow-ups") requests.push(message.params.request.url);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    const task = pending.get(message.id); if (!task) return; pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  evaluate = async expression => {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  await send("Network.enable"); await send("Runtime.enable");
  const token = await encode({ token: { sub: owner }, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET, salt: "authjs.session-token", maxAge: 600 });
  const cookieValues = [["authjs.session-token",token],["coldtrack-time-zone","Asia/Calcutta"],["coldtrack-day",encodeURIComponent(JSON.stringify({key:day.key,start:day.start.toISOString(),end:day.end.toISOString()}))]];
  for (const [name,value] of cookieValues) await send("Network.setCookie", { name, value, url: base, httpOnly: name.startsWith("authjs"), sameSite: "Lax" });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: base + "/follow-ups" });
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length===15 && !!document.querySelector('input[aria-label="Search follow-ups"]')`), "first 15 rows");
  const pageButton = label => `Array.from(document.querySelectorAll('nav[aria-label="Follow-up pages"] button')).find(button=>button.textContent===${JSON.stringify(label)})`;
  for (const page of [2,3,4]) {
    await evaluate(`${pageButton("Next")}.click()`);
    await waitFor(() => evaluate(`document.querySelector('nav[aria-label="Follow-up pages"]').textContent.includes('Page ${page}') && document.querySelectorAll('[data-follow-up-row]').length===15 && document.querySelector('[data-follow-up-row] h3')?.textContent==='Queue company ${(page-1)*15+1}'`), `page ${page} stays bounded`);
  }
  await evaluate(`${pageButton("Previous")}.click()`);
  await waitFor(() => evaluate(`document.querySelector('[data-follow-up-row] h3')?.textContent==='Queue company 31'`), "previous page");
  requests.length = 0;
  async function search(value) {
    await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Search follow-ups"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  await search("N"); await search("Nee"); await search("Needle");
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length===1 && document.querySelector('[data-follow-up-row] h3')?.textContent==='Queue company 120'`), "unloaded match is found");
  assert.equal(await evaluate(`document.querySelector('nav[aria-label="Follow-up pages"]').textContent.includes('Page 1')`), true);
  await pause(600);
  assert.equal(requests.length, 1, "typing is debounced into one query rather than walking pages");
  assert.equal(new URL(requests[0]).searchParams.get("page"), "1");
  async function select(label, option) {
    await evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
    await waitFor(() => evaluate(`!!document.querySelector('[role="option"]')`), "filter options");
    await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(item=>item.textContent===${JSON.stringify(option)}).click()`);
  }
  await select("Follow-up contact method", "Email");
  await waitFor(() => evaluate(`document.body.innerText.includes('No follow-ups match your current filters.')`), "method filter searches globally");
  const afterEmpty = requests.length; await pause(1600);
  assert.equal(requests.length, afterEmpty, "empty results never auto-load more pages");
  await select("Follow-up contact method", "LinkedIn");
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length===1`), "method restores matching row");
  await select("Follow-up status", "Sent");
  await waitFor(() => evaluate(`document.body.innerText.includes('No follow-ups match your current filters.')`), "status filter combines with search");
  await select("Follow-up status", "Ghosted");
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length===1`), "combined filters return the hidden match");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='Clear Filters').click()`);
  await waitFor(() => evaluate(`document.querySelectorAll('[data-follow-up-row]').length===15 && document.querySelector('[data-follow-up-row] h3')?.textContent==='Queue company 1'`), "clear resets filters and pagination");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await pause(300);
  assert.equal(await evaluate(`document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth`), true, "mobile page does not overflow");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ queueRows: 150, unloadedMatchPosition: 120, requestsToFindMatch: 1, maxRenderedRows: 15, browserChecks: "passed" }));
} finally {
  socket?.close(); if (chrome) { chrome.kill(); await pause(500); }
  await sql`DELETE FROM public."user" WHERE id=${owner}`; await sql.end();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved)===path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-follow-up-test-")) await rm(resolved, { recursive:true,force:true,maxRetries:5,retryDelay:300 });
  console.log("Disposable browser queue and profile removed.");
}
