// Production browser checks; all writes belong to disposable accounts.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { encode } from "next-auth/jwt";
import postgres from "postgres";
const base=process.env.TEMPLATE_TEST_URL||"http://localhost:3000";
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local server required');
const owner='template-browser-'+randomUUID(),other=owner+'-other';
const sql=postgres(process.env.DATABASE_URL,{prepare:false,max:1,onnotice(){}});
const profile=await mkdtemp(path.join(tmpdir(),'coldtrack-template-test-'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let chrome,socket;const requests=[],errors=[];
async function waitFor(check,label,timeout=30000){const until=Date.now()+timeout;while(Date.now()<until){if(await check())return;await pause(100);}throw new Error('Timed out: '+label);}
try{
  await sql`INSERT INTO public."user"(id,email,receive_notifications) VALUES(${owner},${owner+'@example.invalid'},false),(${other},${other+'@example.invalid'},false)`;
  await sql`INSERT INTO public.message_templates(user_id,title,body,category,tags,favorite,created_at)
    SELECT ${owner},'Template '||lpad(g::text,3,'0'),repeat('Long message. ',400)||CASE WHEN g=1 THEN ' hidden-body-needle' ELSE '' END,
      CASE WHEN g%2=0 THEN 'Email' ELSE 'LinkedIn' END,jsonb_build_array(CASE WHEN g%3=0 THEN 'team' ELSE 'sales' END),g%4=0,
      '2026-01-01'::timestamp+g*interval '1 second' FROM generate_series(1,60)g`;
  const [privateRow]=await sql`INSERT INTO public.message_templates(user_id,title,body) VALUES(${other},'Private other','Never expose') RETURNING id`;
  const [needle]=await sql`SELECT id,body FROM public.message_templates WHERE user_id=${owner} AND title='Template 001'`;
  const token=await encode({token:{sub:owner},secret:process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET,salt:'authjs.session-token',maxAge:600});
  const headers={cookie:`authjs.session-token=${token}`};
  assert.equal((await fetch(base+'/api/templates/'+needle.id)).status,401);
  assert.equal((await fetch(base+'/api/templates/bad',{headers})).status,400);
  assert.equal((await fetch(base+'/api/templates/'+privateRow.id,{headers})).status,404);
  const response=await fetch(base+'/api/templates/'+needle.id,{headers});assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal((await response.json()).body,needle.body);
  chrome=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank'],{windowsHide:true,stdio:'ignore'});
  let port;
  await waitFor(async()=>{try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);return !!port;}catch{return false;}},'Chrome starts');
  const targets=await(await fetch(`http://localhost:${port}/json/list`)).json();
  socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map();
  socket.onmessage=({data})=>{const message=JSON.parse(data);
    if(message.method==='Fetch.requestPaused'){
      socket.send(JSON.stringify({id:++sequence,method:'Fetch.fulfillRequest',params:{requestId:message.params.requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from('{"error":"Mock unavailable"}').toString('base64')}}));return;
    }
    if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
    const task=pending.get(message.id);if(!task)return;pending.delete(message.id);if(message.error)task.reject(new Error(message.error.message));else task.resolve(message.result);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.text);return response.result.value;};
  await send('Network.enable');await send('Runtime.enable');
  await send('Network.setCookie',{name:'authjs.session-token',value:token,url:base,httpOnly:true,sameSite:'Lax'});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base+'/templates'});
  const cards=`document.querySelectorAll('[data-template-card]')`;
  await waitFor(()=>evaluate(`${cards}.length===18 && document.body.innerText.includes('62 templates')`),'bounded initial library and global count');
  await pause(600);assert.equal(requests.filter(url=>new URL(url).pathname.startsWith('/api/templates/')).length,0,'initial page never fetches full messages');
  const button=label=>`Array.from(document.querySelectorAll('button')).find(button=>button.textContent.trim()===${JSON.stringify(label)})`;
  await send('Network.emulateNetworkConditions',{offline:false,latency:900,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate(`document.querySelector('[aria-label="Edit Template 060"]').click()`);
  await evaluate(`${button('New template')}.click()`);
  await waitFor(()=>evaluate(`document.querySelector('#template-title')?.value===''`),'new draft opens while an older read is pending');
  await pause(2400);
  assert.equal(await evaluate(`document.querySelector('#template-title').value`),'','late body responses cannot replace a newer draft');
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await evaluate(`${button('Cancel')}.click()`);
  await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/templates/*',requestStage:'Request'}]});
  await evaluate(`document.querySelector('[aria-label="Edit Template 059"]').click()`);
  await waitFor(()=>evaluate(`document.body.innerText.includes('Could not load template. Try opening it again.')`),'failed body read has a recovery message');
  await send('Fetch.disable');
  await evaluate(`document.querySelector('[aria-label="Edit Template 059"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#template-title')?.value==='Template 059'`),'body read can be retried');
  await evaluate(`${button('Cancel')}.click()`);
  for(const page of [2,3,4]){
    await evaluate(`Array.from(document.querySelectorAll('nav[aria-label="Template pages"] button')).find(button=>button.textContent==='Next').click()`);
    await waitFor(()=>evaluate(`new URL(location.href).searchParams.get('page')==='${page}' && ${cards}.length===${page===4?8:18} && !document.body.innerText.includes('Loading templates...')`),'page '+page);
  }
  await evaluate(`window.next.router.back()`);
  await waitFor(()=>evaluate(`new URL(location.href).searchParams.get('page')==='3' && ${cards}.length===18`),'back restores page');
  requests.length=0;
  async function search(value){await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Search templates"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
  await search('hidden');await search('hidden-body');await search('hidden-body-needle');
  await waitFor(()=>evaluate(`${cards}.length===1 && document.querySelector('[data-template-card] h2')?.textContent==='Template 001'`),'full-library search beyond previews');
  await pause(500);
  assert.equal(requests.filter(url=>new URL(url).pathname==='/templates').length,1,'search is debounced into one server navigation');
  assert.equal(await evaluate(`document.querySelector('[data-template-card]').innerText.includes('hidden-body-needle')`),false);
  await evaluate(`${button('Read full message')}.click()`);
  await waitFor(()=>evaluate(`document.querySelector('[data-template-card]').innerText.includes('hidden-body-needle')`),'full-body expansion');
  await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  // Exercise the native ClipboardItem payload without reading/changing the host clipboard.
  await evaluate(`(()=>{window.__templateCopyError=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{try{window.__templateCopiedText=await(await items[0].getType('text/plain')).text();}catch(error){window.__templateCopyError=error.message;throw error;}},writeText:async text=>{window.__templateCopiedText=text;}}});})()`);
  await evaluate(`document.querySelector('[aria-label="Copy message"]').click()`);
  await waitFor(async()=>{const state=await evaluate(`({done:!!document.querySelector('[aria-label="Copied"]'),error:window.__templateCopyError})`);if(state.error)throw new Error(state.error);return state.done;},'copy completes');
  assert.equal(await evaluate(`window.__templateCopiedText`),needle.body,'copy payload includes the entire body');
  const bodyRequests=requests.filter(url=>new URL(url).pathname.startsWith('/api/templates/')).length;
  await evaluate(`document.querySelector('[aria-label="Edit Template 001"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#template-body')?.value.length===${needle.body.length}`),'editor opens full message');
  assert.equal(requests.filter(url=>new URL(url).pathname.startsWith('/api/templates/')).length,bodyRequests,'copy/edit reuse the versioned body cache');
  await send('Emulation.setCPUThrottlingRate',{rate:4});
  const inputMs=await evaluate(`(async()=>{const input=document.querySelector('#template-body');const start=performance.now();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,input.value+' edited');input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(requestAnimationFrame);return Math.round(performance.now()-start);})()`);
  await send('Emulation.setCPUThrottlingRate',{rate:1});
  await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
  await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]')`),'save closes editor');
  assert.equal((await sql`SELECT body FROM public.message_templates WHERE id=${needle.id} AND user_id=${owner}`)[0].body,needle.body+' edited','saving cannot truncate a full message');
  await evaluate(`document.querySelector('[aria-label="Pin Template 001"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('[aria-label="Unpin Template 001"]')?.disabled===false`),'pin updates');
  await evaluate(`document.querySelector('[aria-label="Favorite Template 001"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('[aria-label="Unfavorite Template 001"]')?.disabled===false`),'favorite updates');
  await evaluate(`document.querySelector('[aria-label="Duplicate Template 001"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#template-title')?.value==='Template 001 (copy)'`),'duplicate opens complete message');
  assert.equal(await evaluate(`document.querySelector('#template-body').value`),needle.body+' edited');
  await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);
  await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]') && ${cards}.length===2`),'duplicate saves');
  await evaluate(`document.querySelector('[aria-label="Delete Template 001 (copy)"]').click()`);
  await waitFor(()=>evaluate(`!!document.querySelector('[role="dialog"]')`),'delete confirmation');
  await waitFor(()=>evaluate(`${button('Delete template')}?.disabled===false`),'delete action is ready');
  await evaluate(`${button('Delete template')}.click()`);
  await waitFor(()=>evaluate(`!document.querySelector('[role="dialog"]') && ${cards}.length===1`),'delete fills current page');
  await search('');await waitFor(()=>evaluate(`${cards}.length===18 && new URL(location.href).searchParams.get('q')===null`),'clear restores first page');
  async function select(label,value){await evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);await waitFor(()=>evaluate(`!!document.querySelector('[role="option"]')`),'filter menu');await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(option=>option.textContent===${JSON.stringify(value)}).click()`);await pause(500);}
  await select('Filter by category','Email');await select('Filter by tag','team');
  await waitFor(()=>evaluate(`${cards}.length===10`),'combined filters search the full library');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate(`document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth`),true,'mobile does not overflow');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.page-enter')).animationName`),'none','reduced-motion preference is respected');
  await evaluate(`window.next.router.push('/dashboard')`);
  await waitFor(()=>evaluate(`location.pathname==='/dashboard' && !document.querySelector('[aria-label="Search templates"]')`),'leave library');
  await evaluate(`window.next.router.push('/templates?followUp=1')`);
  await waitFor(()=>evaluate(`document.querySelector('#template-title')?.value==='Follow-up 1' && document.querySelector('#template-body').value.length>100`),'linked follow-up opens directly with its complete saved message');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({templates:62,maxCards:18,initialFullBodyRequests:0,debouncedSearchRequests:1,fullBodyCopyEditSave:'passed',pinFavoriteDuplicateDelete:'passed',filtersAndBackNavigation:'passed',mobileAndReducedMotion:'passed',editorInputFrameMsAt4xCpu:inputMs,browserErrors:0}));
}finally{
  socket?.close();if(chrome){chrome.kill();await pause(500);}
  await sql`DELETE FROM public."user" WHERE id IN (${owner},${other})`;await sql.end();
  const resolved=path.resolve(profile);if(path.dirname(resolved)===path.resolve(tmpdir())&&path.basename(resolved).startsWith('coldtrack-template-test-'))await rm(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:300});
  console.log('Disposable template browser accounts and profile removed.');
}
