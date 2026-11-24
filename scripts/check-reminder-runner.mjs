// All scheduler IO and provider requests are mocked. Never sends real email.
import assert from "node:assert/strict";
import createLoader from "./reliability-test-loader.cjs";

const asOf="2026-11-25T12:00:00.000Z";
function harness(count,settings={}) {
  const users=Array.from({length:count},(_,index)=>({id:String(index).padStart(4,"0"),email:"test@example.invalid",name:"Test",timeZone:"UTC",reminderTime:"00:00",notificationEmail:null}));
  const attempts=new Map(),calls=[],metrics={pages:0,summaries:0,active:0,maxActive:0};
  let fail=settings.fail;
  const load=createLoader({
    "@/lib/reminder-query":{REMINDER_PAGE_SIZE:50,expireReminderAttempts:async()=>{},readReminderUsers:async after=>{
      metrics.pages++;if(settings.failPageAt===metrics.pages)throw new Error("Mock database outage");
      return users.filter(user=>after===null||user.id>after).slice(0,51);
    },readReminderSummaries:async windows=>{
      metrics.summaries++;return windows.map(({id})=>({id,sent:settings.sent??false,due:settings.due??1,attempts:[...attempts].filter(([key])=>key.startsWith(id+"/")).map(([key,state])=>({kind:key.split("/")[1],state}))}));
    }},
    "@/lib/reminder-delivery":{deliverReminder:async(id,day,kind)=>{
      const key=id+"/"+kind;calls.push({id,day,kind,at:performance.now()});metrics.active++;metrics.maxActive=Math.max(metrics.maxActive,metrics.active);
      try{
        await new Promise(resolve=>setImmediate(resolve));
        settings.advance?.();
        if(fail===key){attempts.set(key,"failed");throw new Error("Mock provider failure");}
        assert.notEqual(attempts.get(key),"sent","accepted deliveries cannot repeat");attempts.set(key,"sent");return "sent";
      }finally{metrics.active--;}
    }},
  });
  return {...load("lib/reminder-runner.ts"),users,attempts,calls,metrics,clearFailure:()=>{fail=null;}};
}
const cursor={after:null,asOf};
let h=harness(123,{sent:true,due:0});
let result=await h.runReminders(cursor,{sendIntervalMs:0});
assert.equal(result.complete,true);assert.equal(result.processed,123);assert.equal(h.metrics.pages,3);assert.equal(h.metrics.summaries,3);assert.equal(h.calls.length,0);
h=harness(10);result=await h.runReminders(cursor,{sendIntervalMs:0});
assert.equal(result.sent,20);assert.equal(h.metrics.maxActive,2);assert.equal(result.nextCursor,null);
h=harness(3);await h.runReminders(cursor,{sendIntervalMs:15});
for(let i=1;i<h.calls.length;i++) assert.ok(h.calls[i].at-h.calls[i-1].at>=10,"send starts are paced");
let clock=0;
h=harness(7,{advance:()=>{clock+=100;}});
let continuation=cursor,runs=0;
do{
  clock=0;result=await h.runReminders(continuation,{now:()=>clock,budgetMs:150,sendIntervalMs:0});runs++;
  if(result.nextCursor) continuation=h.parseReminderCursor(result.nextCursor,Date.parse(asOf));
  assert.equal(continuation.asOf,asOf);assert.ok(runs<30,"cursor makes progress without skipping partial users");
}while(!result.complete);
assert.equal(h.attempts.size,14);assert.equal(h.calls.length,14);
h=harness(5,{fail:"0002/daily"});
const originalError=console.error;console.error=()=>{};
try{result=await h.runReminders(cursor,{sendIntervalMs:0});}finally{console.error=originalError;}
assert.equal(result.success,false);assert.equal(result.failed,1);assert.ok(result.retryCursor);
const retry=h.parseReminderCursor(result.retryCursor,Date.parse(asOf));assert.equal(retry.after,"0001");
h.clearFailure();result=await h.runReminders(retry,{sendIntervalMs:0});assert.equal(result.success,true);
console.error=()=>{};
try{
  h=harness(123,{sent:true,due:0,failPageAt:2});
  result=await h.runReminders(cursor,{sendIntervalMs:0});
  assert.equal(result.success,false);assert.equal(result.processed,50);
  assert.equal(h.parseReminderCursor(result.nextCursor,Date.parse(asOf)).after,'0049',"database failures retain the last completed page");
  clock=0;h=harness(2,{fail:'0001/daily',advance:()=>{clock+=100;}});
  result=await h.runReminders(cursor,{now:()=>clock,budgetMs:150,sendIntervalMs:0});
  const resume=h.parseReminderCursor(result.retryCursor,Date.parse(asOf));
  const firstUnfinished=h.users.findIndex(user=>['daily','follow_up'].some(kind=>h.attempts.get(user.id+'/'+kind)!=='sent'));
  assert.ok(h.users.findIndex(user=>user.id===resume.after)<firstUnfinished,"retry cursor includes earlier unfinished users");
}finally{console.error=originalError;}
h=harness(2,{sent:true,due:0});h.attempts.set("0000/daily","failed");h.attempts.set("0001/follow_up","sending");
await h.runReminders(cursor,{sendIntervalMs:0});assert.equal(h.calls.length,2,"frozen attempts resume after live counts change");
for(const raw of ["", "bad!", Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({after:null,asOf:"2020-01-01T00:00:00.000Z"})).toString('base64url')]) assert.throws(()=>h.parseReminderCursor(raw,Date.parse(asOf)));
const oldMode=process.env.REMINDER_SCHEDULE_MODE;
try{
  process.env.REMINDER_SCHEDULE_MODE="frequent";h=harness(1);h.users[0].reminderTime="23:00";
  await h.runReminders(cursor,{sendIntervalMs:0});assert.equal(h.calls.length,0);
}finally{if(oldMode===undefined)delete process.env.REMINDER_SCHEDULE_MODE;else process.env.REMINDER_SCHEDULE_MODE=oldMode;}

// Verify the installed Resend SDK forwards the abort signal and frozen key.
const previousFetch=globalThis.fetch,previousKey=process.env.RESEND_API_KEY,previousTimeout=AbortSignal.timeout;
let transportCalls=0;
try{
  process.env.RESEND_API_KEY="re_mock_test_key";
  AbortSignal.timeout=milliseconds=>{assert.equal(milliseconds,10000);const controller=new AbortController();setTimeout(()=>controller.abort(),5);return controller.signal;};
  globalThis.fetch=async(url,options)=>{
    transportCalls++;assert.equal(new URL(url).hostname,"api.resend.com");
    assert.equal(new Headers(options.headers).get("Idempotency-Key"),"mock-frozen-key");assert.ok(options.signal instanceof AbortSignal);
    return new Promise((resolve,reject)=>options.signal.addEventListener("abort",()=>reject(new Error("Mock abort")),{once:true}));
  };
  const {sendReminderEmail,buildReminderEmail}=createLoader()("lib/resend.ts");
  const response=await sendReminderEmail(buildReminderEmail("daily","test@example.invalid","Test"),"mock-frozen-key");
  assert.ok(response.error);assert.equal(transportCalls,1);
}finally{
  globalThis.fetch=previousFetch;AbortSignal.timeout=previousTimeout;
  if(previousKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=previousKey;
}
const previousSecret=process.env.CRON_SECRET;
try{
  process.env.CRON_SECRET='mock-cron-secret';let calls=0;
  const route=createLoader({'@/lib/reminder-runner':{parseReminderCursor:(raw)=>h.parseReminderCursor(raw,Date.parse(asOf)),runReminders:async()=>{calls++;return {success:false,complete:false,nextCursor:'mock-continuation'};}}})("app/api/cron/notifications/route.ts");
  const request=suffix=>new Request('http://localhost/api/cron/notifications'+suffix,{headers:{authorization:'Bearer mock-cron-secret'}});
  assert.equal((await route.GET(request('?cursor=bad!'))).status,400);assert.equal(calls,0);
  const response=await route.GET(request(''));
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal((await response.json()).nextCursor,'mock-continuation');assert.equal(route.maxDuration,60);
}finally{if(previousSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previousSecret;}
console.log(JSON.stringify({checks:"paging, bounded concurrency, pacing, deadline, continuation, partial users, failures, frozen retries, cursor validation, frequent schedule, transport abort passed",maxActiveDeliveries:2,usersWithoutReminders:123,summaryQueries:3,realEmailsSent:0}));
