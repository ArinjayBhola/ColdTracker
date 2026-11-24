// Real transactional/concurrent writes in a disposable private schema only.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import createLoader from "./reliability-test-loader.cjs";

const client=postgres(process.env.DATABASE_URL,{prepare:false,max:4,onnotice(){}});
const namespace=`startup_save_check_${randomUUID().replaceAll("-","")}`;
const queries=[],statements=[];
let pauseNextLock,releaseLock;
const schema=createLoader()("db/schema.ts");
const scoped=callback=>client.begin(async pg=>{
  await pg.unsafe(`SET LOCAL search_path TO "${namespace}", pg_catalog; SET LOCAL statement_timeout='20s'`);
  return callback(pg);
});
const db={transaction:callback=>scoped(async pg=>{
  pg.options=client.options;
  const tx=drizzle(pg,{schema,logger:{logQuery(query,params){queries.push(query);statements.push({query,params});}}});
  const execute=tx.execute.bind(tx);
  tx.execute=async query=>{
    const result=await execute(query);
    if(pauseNextLock){const pause=pauseNextLock;pauseNextLock=null;pause.entered();await pause.wait;}
    return result;
  };
  return callback(tx);
})};
const load=createLoader({"@/db":{db}});
const {saveStartupRecord}=load("lib/startup-save.ts");
const {startupFormSchema,normalizeStartupName,startupWebsiteDomain}=load("lib/startup-validation.ts");
const form=(name,website="",employees=[{name:"Founder",role:"",email:"",linkedinUrl:""}])=>startupFormSchema.parse({name,website,employees,description:"",logoUrl:"",sector:"",location:"",teamSize:"",fundingRound:"",fundingAmount:"",fundingDate:"",isHiring:false,isTrending:false});
const members=id=>scoped(pg=>pg`SELECT * FROM startup_employees WHERE startup_id=${id} ORDER BY created_at,id`);
async function conflict(left,right){
  const results=await Promise.allSettled([saveStartupRecord(left),saveStartupRecord(right)]);
  assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
  assert.match(results.find(result=>result.status==="rejected").reason.message,/A startup with/);
}
try{
  await client.begin(async pg=>{
    await pg.unsafe(`CREATE SCHEMA "${namespace}"`);
    for(const table of ["startups","startup_employees"]) await pg.unsafe(`CREATE TABLE "${namespace}"."${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
  });
  const id=await saveStartupRecord(form("Initial"));
  const [original]=await members(id);
  await scoped(pg=>pg`UPDATE startup_employees SET status='contacted',emails_sent=7 WHERE id=${original.id}`);
  await saveStartupRecord(form("Initial edited","",[{id:original.id,name:"Edited",role:"CTO",email:"founder@example.invalid",linkedinUrl:"https://linkedin.com/in/test"},{name:"New member",role:"",email:"",linkedinUrl:""}]),id);
  let team=await members(id);
  assert.equal(team.length,2);
  const edited=team.find(member=>member.id===original.id);
  assert.equal(edited.name,"Edited");assert.equal(edited.status,"contacted");assert.equal(edited.emails_sent,7);
  assert.equal(new Date(edited.created_at).getTime(),new Date(original.created_at).getTime());
  const newMember=team.find(member=>member.id!==original.id);
  await saveStartupRecord(form("Initial edited","",[{id:newMember.id,name:"Remaining",role:"",email:"",linkedinUrl:""}]),id);
  team=await members(id);assert.equal(team.length,1);assert.equal(team[0].id,newMember.id);
  const foreign=await saveStartupRecord(form("Foreign"));const [foreignMember]=await members(foreign);
  for(const invalid of [[{id:foreignMember.id,name:"Tamper",role:"",email:"",linkedinUrl:""}],[{id:newMember.id,name:"Repeat",role:"",email:"",linkedinUrl:""},{id:newMember.id,name:"Repeat",role:"",email:"",linkedinUrl:""}]]){
    await assert.rejects(saveStartupRecord(form("Should roll back","",invalid),id),/Invalid team member/);
    assert.equal((await scoped(pg=>pg`SELECT name FROM startups WHERE id=${id}`))[0].name,"Initial edited");
    assert.equal((await members(id))[0].name,"Remaining");
  }
  await assert.rejects(saveStartupRecord(form("Gone"),randomUUID()),/no longer exists/);
  await conflict(form("Race, Company"),form("RACE COMPANY"));
  await conflict(form("Domain A","https://www.race-example.invalid/about"),form("Domain B","http://race-example.invalid/other"));
  // Confirm conservative SQL prefilters retain the exact Unicode/WHATWG rules.
  const pairs=[
    ["Ｆｕｌｌｗｉｄｔｈ",null,"fullwidth",null],
    ["Greek ΟΣ",null,"Greek ος",null],
    ["Turkish İ",null,"Turkish i",null],
    ["URL percent","https://%65xample.invalid", "Different percent","https://example.invalid/"],
    ["URL unicode","https://例え.テスト", "Different unicode","https://xn--r8jz45g.xn--zckzah/"],
    ["URL tabs","https://exa\tmple-tab.invalid", "Different tabs","https://example-tab.invalid"],
    ["URL numeric","http://0x7f000001/", "Different numeric","http://127.0.0.1/"],
    ["URL ipv6","http://[0:0:0:0:0:0:0:1]/", "Different ipv6","http://[::1]/"],
  ];
  for(const [name,website,otherName,otherWebsite] of pairs){
    // Raw legacy records can contain URLs that the current form normalizes.
    await scoped(pg=>pg`INSERT INTO startups(name,website) VALUES(${name},${website})`);
    assert.ok(normalizeStartupName(name)===normalizeStartupName(otherName)||(website&&startupWebsiteDomain(website)===startupWebsiteDomain(otherWebsite)));
    await assert.rejects(saveStartupRecord(form(otherName,otherWebsite??"")),/A startup with/);
  }
  let entered;
  const enteredPromise=new Promise(resolve=>{entered=resolve;});
  pauseNextLock={entered,wait:new Promise(resolve=>{releaseLock=resolve;})};
  const slow=saveStartupRecord(form("Independent paused"));
  await enteredPromise;
  let timer;
  try{
    await Promise.race([saveStartupRecord(form("Independent fast")),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Unrelated save was blocked")),5000);})]);
  }finally{clearTimeout(timer);releaseLock();await slow;}
  // Representative large catalog/team: no per-member write requests.
  await scoped(pg=>pg`INSERT INTO startups(name,website) SELECT 'Scale company '||g,'https://scale-'||g||'.invalid' FROM generate_series(1,10000)g`);
  const scaleId=await saveStartupRecord(form("Scale editor","",Array.from({length:100},(_,i)=>({name:`Member ${i}`,role:"",email:"",linkedinUrl:""}))));
  const fullTeam=await members(scaleId);
  const input=form("Scale editor","",fullTeam.map(member=>({id:member.id,name:member.name+" updated",role:"Founder",email:"",linkedinUrl:""})));
  const before=queries.length;const start=performance.now();
  await saveStartupRecord(input,scaleId);
  const newMs=Math.round(performance.now()-start);const newQueries=queries.slice(before);
  assert.equal(newQueries.length,6);
  assert.equal(newQueries.filter(query=>query.startsWith("UPDATE startup_employees")).length,1);
  assert.ok(newQueries.every(query=>!query.includes("LOCK TABLE")));
  const duplicateQuery=statements.slice(before).find(statement=>statement.query.includes('regexp_replace'));
  const candidates=await scoped(pg=>pg.unsafe(duplicateQuery.query,duplicateQuery.params));
  assert.ok(candidates.length<20,"typical ASCII catalog rows stay on the server");
  const [plan]=await scoped(pg=>pg.unsafe(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${duplicateQuery.query}`,duplicateQuery.params));
  const after=await members(scaleId);assert.equal(after.length,100);assert.ok(after.every(member=>member.name.endsWith(" updated")));
  let oldQueries=0;const oldStart=performance.now();
  await scoped(async pg=>{
    await pg`LOCK TABLE startups IN SHARE ROW EXCLUSIVE MODE`;oldQueries++;
    const catalog=await pg`SELECT id,name,website FROM startups`;oldQueries++;
    assert.ok(catalog.length>10000);
    await pg`UPDATE startups SET updated_at=now() WHERE id=${scaleId}`;oldQueries++;
    await pg`SELECT id FROM startup_employees WHERE startup_id=${scaleId}`;oldQueries++;
    for(const member of input.employees){await pg`UPDATE startup_employees SET name=${member.name},role=${member.role},email=null,linkedin_url=null,updated_at=now() WHERE id=${member.id} AND startup_id=${scaleId}`;oldQueries++;}
  });
  console.log(JSON.stringify({catalogRows:10000,teamMembers:100,oldQueries,newQueries:newQueries.length,oldMs:Math.round(performance.now()-oldStart),newMs,candidateRows:candidates.length,duplicateScanPlan:plan['QUERY PLAN'][0].Plan['Node Type'],duplicateScanMs:plan['QUERY PLAN'][0]['Execution Time'],checks:"create/edit/delete/rollback/Unicode/URLs/concurrent duplicates/unrelated saves passed"}));
}finally{
  releaseLock?.();
  if(!/^startup_save_check_[a-f0-9]{32}$/.test(namespace)) throw new Error("Refusing unsafe schema cleanup");
  await client.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
  await client.end();
  console.log("Disposable startup-save schema removed.");
}
