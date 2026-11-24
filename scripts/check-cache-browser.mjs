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

const base = process.env.CACHE_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const owner = `cache-browser-${randomUUID()}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const profile = await mkdtemp(path.join(tmpdir(), "coldtrack-cache-test-"));
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
  await pause(700);
  assert.equal(requests.length,0,"server-seeded queue makes no duplicate API request");
  await sql`UPDATE public.outreach SET company_name='Refreshed queue company',notes='Fresh server notes',updated_at=now() WHERE "userId"=${owner} AND company_name='Queue company 1'`;
  const [{id}]=await sql`SELECT id FROM public.outreach WHERE "userId"=${owner} AND company_name='Refreshed queue company'`;
  await evaluate(`window.next.router.refresh()`);
  await waitFor(()=>evaluate(`document.querySelector('[data-follow-up-row] h3')?.textContent==='Refreshed queue company'`),"server refresh replaces existing queue cache");
  assert.equal(requests.length,0,"queue refresh uses the new server snapshot without an API waterfall");
  await evaluate(`window.next.router.push('/outreach/${id}')`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Fresh server notes') && !!document.querySelector('[aria-label="Refresh data"]')`),"outreach detail snapshot");
  await sql`UPDATE public.outreach SET notes='Newer server notes',updated_at=now() WHERE id=${id} AND "userId"=${owner}`;
  await evaluate(`window.next.router.refresh()`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Newer server notes')`),"detail and notes display reconcile refreshed server data");
  await evaluate(`window.next.router.push('/stats')`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Outreach Analytics') || document.body.innerText.includes('Outreach volume') || document.body.innerText.includes('Performance')`),"statistics route");
  await pause(1000);
  await evaluate(`window.next.router.push('/follow-ups')`);
  await waitFor(()=>evaluate(`document.querySelectorAll('[data-follow-up-row]').length===15`),"return to cached queue");
  // A status mutation must invalidate all queue variants, stats, and the detail cache.
  await evaluate(`document.querySelector('[data-follow-up-row] [aria-label="Outreach status"]').click()`);
  await waitFor(()=>evaluate(`!!document.querySelector('[role="option"]')`),"status menu");
  await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(option=>option.textContent==='Replied').click()`);
  await waitFor(()=>evaluate(`!Array.from(document.querySelectorAll('[data-follow-up-row] h3')).some(item=>item.textContent==='Refreshed queue company')`),"status change removes item from active queue");
  assert.equal((await sql`SELECT status FROM public.outreach WHERE id=${id} AND "userId"=${owner}`)[0].status,'REPLIED');
  await evaluate(`window.next.router.push('/templates')`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Follow-up') && document.body.innerText.includes('New template')`),"template library");
  const [template]=await sql`SELECT id,title FROM public.message_templates WHERE user_id=${owner} ORDER BY id LIMIT 1`;
  await sql`UPDATE public.message_templates SET title='Refreshed template title',updated_at=now() WHERE id=${template.id} AND user_id=${owner}`;
  await evaluate(`window.next.router.refresh()`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Refreshed template title')`),"template local state accepts server refresh");
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()==='New template').click()`);
  await waitFor(()=>evaluate(`!!document.querySelector('[role="dialog"] textarea')`),"template draft opens");
  await evaluate(`(()=>{const input=document.querySelector('[role="dialog"] textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Unsaved draft');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sql`UPDATE public.message_templates SET title='Cross-tab template title',updated_at=now() WHERE id=${template.id} AND user_id=${owner}`;
  await evaluate(`(()=>{const channel=new BroadcastChannel('coldtrack-templates');channel.postMessage('updated');setTimeout(()=>channel.close(),100);})()`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Cross-tab template title')`),"template broadcast refresh");
  assert.equal(await evaluate(`document.querySelector('[role="dialog"] textarea').value`),'Unsaved draft',"server refresh preserves the open editor draft");
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({duplicateInitialQueueRequests:0,queueServerRefresh:'passed',detailServerRefresh:'passed',statusMutation:'passed',templatesServerRefresh:'passed',templatesBroadcast:'passed',browserErrors:0}));
} finally {
  socket?.close(); if (chrome) { chrome.kill(); await pause(500); }
  await sql`DELETE FROM public."user" WHERE id=${owner}`; await sql.end();
  const resolved = path.resolve(profile);
  if (path.dirname(resolved)===path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-cache-test-")) await rm(resolved, { recursive:true,force:true,maxRetries:5,retryDelay:300 });
  console.log("Disposable browser queue and profile removed.");
}
