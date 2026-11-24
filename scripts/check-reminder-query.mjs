// Private rollback-only PostgreSQL fixture. No scheduler run and no email client.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import createLoader from "./reliability-test-loader.cjs";

const client=postgres(process.env.DATABASE_URL,{prepare:false,max:1,onnotice(){}});
const namespace=`reminder_check_${randomUUID().replaceAll("-","")}`;
const rollback=new Error("ROLLBACK_REMINDER_CHECK");
try{
  await client.begin(async pg=>{
    await pg.unsafe(`CREATE SCHEMA "${namespace}"; SET LOCAL search_path TO "${namespace}",pg_catalog; SET LOCAL statement_timeout='30s'`);
    for(const table of ["user","outreach","reminder_deliveries"]) await pg.unsafe(`CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
    const migration=(await readFile("drizzle/0018_follow_up_lookup.sql","utf8")).replace(/\bpublic\b/g,namespace);
    await pg.unsafe(migration);
    await pg`INSERT INTO "user"(id,email,time_zone,reminder_time,receive_notifications)
      SELECT 'owner'||lpad(g::text,3,'0'),'test@example.invalid','UTC','00:00',g<>61 FROM generate_series(1,61)g`;
    await pg`INSERT INTO outreach("userId",company_name,role_targeted,status,contacts)
      SELECT 'owner'||lpad(u::text,3,'0'),'Test','Engineer',
        (ARRAY['SENT','DRAFT','REPLIED','GHOSTED','INTERVIEW','OFFER','CLOSED','REJECTED'])[1+g%8]::public.status,
        jsonb_build_array(jsonb_build_object('id',md5(u::text||'/'||g::text),
          'messageSentAt',CASE WHEN g%5=0 THEN '2026-11-25T12:00:00Z' ELSE '2026-11-24T12:00:00Z' END,
          'followUpDueAt',CASE WHEN g%3=0 THEN '2026-11-27T12:00:00Z' ELSE '2026-11-24T12:00:00Z' END,
          'followUpSentAt',CASE WHEN g%7=0 THEN '2026-11-24T12:00:00Z' ELSE null END,
          'followUp2DueAt','2026-11-25T12:00:00Z',
          'followUp2SentAt',CASE WHEN g%11=0 THEN '2026-11-25T12:00:00Z' ELSE null END))
      FROM generate_series(1,61)u CROSS JOIN generate_series(1,200)g`;
    await pg`INSERT INTO reminder_deliveries(user_id,day,kind,state,payload)
      SELECT 'owner'||lpad(g::text,3,'0'),'2026-11-25','daily',(ARRAY['pending','sending','sent','failed','expired'])[1+g%5],'{}'::jsonb FROM generate_series(1,61)g`;
    // Expiration is capped and must leave accepted rows untouched.
    await pg`INSERT INTO reminder_deliveries(user_id,day,kind,state,payload,created_at)
      SELECT 'owner001','old-'||lpad(g::text,5,'0'),'follow_up',CASE WHEN g=1002 THEN 'sent' ELSE 'failed' END,'{}'::jsonb,now()-interval '2 days' FROM generate_series(1,1002)g`;
    pg.options=client.options;
    const statements=[];
    const db=drizzle(pg,{logger:{logQuery(query,params){statements.push({query,params});}}});
    const {readReminderUsers,readReminderSummaries,expireReminderAttempts}=createLoader({"@/db":{db}})("lib/reminder-query.ts");
    const first=await readReminderUsers(null);assert.equal(first.length,51);assert.equal(first[0].id,"owner001");
    const next=await readReminderUsers(first[49].id);assert.equal(next.length,10);assert.equal(next.at(-1).id,"owner060");
    const windows=first.slice(0,50).map(user=>({id:user.id,day:"2026-11-25",start:"2026-11-25T00:00:00Z",end:"2026-11-26T00:00:00Z"}));
    const start=performance.now();const actual=await readReminderSummaries(windows);const batchMs=Math.round(performance.now()-start);
    assert.equal(actual.length,50);
    const statement=statements.at(-1);
    // Independent JSONB reference for every owner's counts in one validation query.
    const reference=await pg`SELECT o."userId" AS id,
      bool_or(o.status<>'DRAFT' AND (c->>'messageSentAt')::timestamptz >= '2026-11-25T00:00:00Z'::timestamptz AND (c->>'messageSentAt')::timestamptz < '2026-11-26T00:00:00Z'::timestamptz) AS sent,
      count(*) FILTER(WHERE o.status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED') AND nullif(c->>'followUp2SentAt','') IS NULL AND
        (CASE WHEN nullif(c->>'followUpSentAt','') IS NOT NULL THEN nullif(c->>'followUp2DueAt','')::timestamptz ELSE nullif(c->>'followUpDueAt','')::timestamptz END) < '2026-11-26T00:00:00Z'::timestamptz)::int AS due
      FROM outreach o CROSS JOIN LATERAL jsonb_array_elements(o.contacts)c GROUP BY o."userId"`;
    for(const row of actual){
      const expected=reference.find(value=>value.id===row.id);assert.equal(row.sent,expected.sent);assert.equal(row.due,expected.due);
      const index=Number(row.id.slice(5));assert.deepEqual(row.attempts,[{kind:"daily",state:["pending","sending","sent","failed","expired"][index%5]}]);
    }
    const [plan]=await pg.unsafe(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${statement.query}`,statement.params);
    const indexNames=[];
    function inspectPlan(node){
      if(node['Index Name'])indexNames.push(node['Index Name']);
      for(const child of node.Plans??[])inspectPlan(child);
    }
    inspectPlan(plan['QUERY PLAN'][0].Plan);
    const dueIndexUsed=indexNames.some(name=>name.includes('follow_up_lookup'));
    assert.ok(dueIndexUsed);
    const oldStart=performance.now();
    for(const window of windows.slice(0,10)){
      await pg`SELECT count(*) FROM outreach o CROSS JOIN LATERAL jsonb_array_elements(o.contacts)c WHERE o."userId"=${window.id} AND o.status<>'DRAFT'
        AND (c->>'messageSentAt')::timestamptz >= ${window.start}::timestamptz AND (c->>'messageSentAt')::timestamptz < ${window.end}::timestamptz`;
      await pg`SELECT kind FROM reminder_deliveries WHERE user_id=${window.id} AND day=${window.day} AND state IN ('pending','sending','failed')`;
    }
    const oldTenUsersMs=Math.round(performance.now()-oldStart);
    const tenStart=performance.now();await readReminderSummaries(windows.slice(0,10));const batchTenUsersMs=Math.round(performance.now()-tenStart);
    const [bad]=await pg`SELECT id FROM outreach WHERE "userId"='owner001' LIMIT 1`;
    await pg`UPDATE outreach SET contacts=jsonb_build_array(jsonb_build_object('id','bad','messageSentAt','invalid','followUpDueAt','invalid')) WHERE id=${bad.id}`;
    assert.equal((await readReminderSummaries(windows.slice(0,1))).length,1,"malformed contact dates do not poison the batch");
    await expireReminderAttempts();
    const [expired]=await pg`SELECT count(*) FILTER(WHERE state='expired')::int expired,count(*) FILTER(WHERE state='failed')::int failed,count(*) FILTER(WHERE state='sent')::int sent FROM reminder_deliveries WHERE day LIKE 'old-%'`;
    assert.deepEqual(expired,{expired:1000,failed:1,sent:1});
    await expireReminderAttempts();
    assert.equal((await pg`SELECT count(*)::int count FROM reminder_deliveries WHERE day LIKE 'old-%' AND state='failed'`)[0].count,0);
    console.log(JSON.stringify({users:60,outreachRows:12200,parityOwners:50,batchSummaryQueries:1,batch50UsersMs:batchMs,oldTenUsersQueries:20,oldTenUsersMs,batchTenUsersQueries:1,batchTenUsersMs,dueLookupIndexUsed:dueIndexUsed,expiryWriteLimit:1000,realEmailsSent:0}));
    throw rollback;
  });
}catch(error){if(error!==rollback)throw error;}
finally{await client.end();}
console.log("Reminder query fixture rolled back.");
