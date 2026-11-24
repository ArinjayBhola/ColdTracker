// Local production UI/API checks. Only disposable catalog rows and users are written.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";

const base = process.env.STARTUP_TEST_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Tests require a local server");
const owner = `startup-browser-${randomUUID()}`;
const prefix = `StartupTest${randomUUID().replaceAll("-","")}`;
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const profile = await mkdtemp(path.join(tmpdir(),"coldtrack-startup-test-"));
const ids = [], requests = [], errors = [];
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
let chrome, socket;
async function waitFor(check,label,timeout=30000) {
  const until=Date.now()+timeout;
  while(Date.now()<until) { if(await check()) return; await pause(100); }
  throw new Error(`Timed out: ${label}`);
}
try {
  await sql`INSERT INTO public."user"(id,email,receive_notifications) VALUES(${owner},${owner+"@example.invalid"},false)`;
  for(let index=0;index<23;index++) {
    const [item]=await sql`INSERT INTO public.startups(name,team_size,sector) VALUES(${prefix+String(index).padStart(2,"0")},${index%2 ? "11-50":"1-10"},'Test') RETURNING id`;
    ids.push(item.id);
    await sql`INSERT INTO public.startup_employees(startup_id,name,email,created_at)
      SELECT ${item.id},'Preview member '||g,'preview'||g||'@example.invalid','2026-01-01'::timestamp+g*interval '1 second' FROM generate_series(1,5)g`;
  }
  const token=await encode({token:{sub:owner},secret:process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET,salt:"authjs.session-token",maxAge:600});
  const headers={cookie:`authjs.session-token=${token}`};
  assert.equal((await fetch(base+"/api/startups/teams?ids="+ids[0])).status,401);
  for(const value of ["","bad",Array(51).fill(ids[0]).join(",")]) assert.equal((await fetch(base+"/api/startups/teams?"+new URLSearchParams({ids:value}),{headers})).status,400);
  const response=await fetch(base+"/api/startups/teams?ids="+ids.slice(0,3).join(","),{headers});
  assert.equal(response.status,200); assert.equal(response.headers.get("cache-control"),"private, no-store");
  const teams=await response.json();
  assert.equal(Object.keys(teams).length,3);
  for(const team of Object.values(teams)) { assert.equal(team.employeeCount,5); assert.equal(team.employees.length,2); }
  const pageUrl=base+"/startups?"+new URLSearchParams({q:prefix});
  const times=[];
  for(let i=0;i<3;i++) {
    const start=performance.now(); const page=await fetch(pageUrl,{headers}); const html=await page.text();
    times.push(Math.round(performance.now()-start)); assert.equal(page.status,200);
    assert.ok(!html.includes("preview1@example.invalid"),"grid HTML excludes employee records");
  }
  chrome=spawn(process.env.CHROME_PATH||"C:/Program Files/Google/Chrome/Application/chrome.exe",["--headless=new","--remote-debugging-port=0",`--user-data-dir=${profile}`,"--no-first-run","--no-default-browser-check","--disable-background-networking","about:blank"],{windowsHide:true,stdio:"ignore"});
  let port;
  await waitFor(async()=>{try{port=Number((await readFile(path.join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]); return !!port;}catch{return false;}},"Chrome starts");
  const targets=await(await fetch(`http://localhost:${port}/json/list`)).json();
  socket=new WebSocket(targets.find(target=>target.type==="page").webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0; const pending=new Map();
  socket.onmessage=({data})=>{
    const message=JSON.parse(data);
    if(message.method==="Network.requestWillBeSent" && new URL(message.params.request.url).pathname==="/api/startups/teams") requests.push(message.params.request.url);
    if(message.method==="Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    const task=pending.get(message.id); if(!task) return;pending.delete(message.id);
    if(message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{
    const response=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };
  await send("Network.enable");await send("Runtime.enable");
  await send("Network.setCookie",{name:"authjs.session-token",value:token,url:base,httpOnly:true,sameSite:"Lax"});
  await send("Emulation.setDeviceMetricsOverride",{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:pageUrl});
  await waitFor(()=>evaluate(`document.querySelectorAll('[role="checkbox"][aria-label^="Select ${prefix}"]').length===21`),"21 grid items");
  await pause(700);assert.equal(requests.length,0,"grid makes no employee preview requests");
  const button=label=>`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()===${JSON.stringify(label)})`;
  await evaluate(`${button("Details")}.click()`);
  await waitFor(()=>evaluate(`document.querySelectorAll('tbody tr').length===21 && document.querySelector('tbody').innerText.includes('Preview member 2') && !document.querySelector('tbody').innerText.includes('Loading team...')`),"bounded team previews");
  assert.equal(requests.length,1);
  assert.equal(new URL(requests[0]).searchParams.get("ids").split(",").length,21);
  assert.equal(await evaluate(`document.querySelector('tbody').innerText.includes('Preview member 3')`),false);
  assert.equal(await evaluate(`document.querySelector('tbody').innerText.includes('+3 more')`),true);
  await evaluate(`${button("Grid")}.click()`);await evaluate(`${button("Details")}.click()`);await pause(500);
  assert.equal(requests.length,1,"fresh preview cache is reused when toggling views");
  await evaluate(`document.querySelector('button[aria-label^="Edit ${prefix}"]').click()`);
  await waitFor(()=>evaluate(`document.querySelectorAll('[aria-label="Team members"] h4').length===5`),"editor still loads the entire team");
  await evaluate(`(()=>{const input=document.querySelector('[role="dialog"] input[id$="employees.0.name"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Edited preview member');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
  await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]') && document.querySelector('tbody')?.innerText.includes('Edited preview member')`),"save refreshes the team preview");
  const saved=await sql`SELECT name FROM public.startup_employees WHERE startup_id=${ids[0]} ORDER BY created_at,id`;
  assert.equal(saved.length,5);assert.equal(saved[0].name,'Edited preview member');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({productionPageTimesMs:times,gridEmployeeRequests:0,detailsEmployeeRequests:1,previewMembersPerCompany:2,editorMembers:5,saveAndPreviewRefresh:"passed",apiChecks:"passed",browserChecks:"passed"}));
} finally {
  socket?.close(); if(chrome){chrome.kill();await pause(500);}
  if(ids.length) await sql`DELETE FROM public.startups WHERE id IN ${sql(ids)}`;
  await sql`DELETE FROM public."user" WHERE id=${owner}`;await sql.end();
  const resolved=path.resolve(profile);
  if(path.dirname(resolved)===path.resolve(tmpdir()) && path.basename(resolved).startsWith("coldtrack-startup-test-")) await rm(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});
  console.log("Disposable startup catalog rows, user, and browser profile removed.");
}
