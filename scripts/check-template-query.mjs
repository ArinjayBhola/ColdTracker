// Real SQL and actions in a private rollback-only schema; no emails or real edits.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import createLoader from "./reliability-test-loader.cjs";
const client=postgres(process.env.DATABASE_URL,{prepare:false,max:1,onnotice(){}});
const namespace='template_check_'+randomUUID().replaceAll('-','');const rollback=new Error('ROLLBACK_TEMPLATE_CHECK');
try{
  await client.begin(async pg=>{
    await pg.unsafe(`CREATE SCHEMA "${namespace}"; SET LOCAL search_path TO "${namespace}",pg_catalog; SET LOCAL statement_timeout='30s'; CREATE TABLE message_templates (LIKE public.message_templates INCLUDING DEFAULTS INCLUDING INDEXES)`);
    pg.options=client.options;const queries=[];
    const db=drizzle(pg,{logger:{logQuery(query,params){queries.push({query,params});}}});
    const load=createLoader({'@/db':{db},'@/lib/auth':{auth:async()=>({user:{id:'owner'}})},'next/cache':{revalidatePath(){}}});
    const {readTemplateLibrary,readTemplate}=load('lib/template-query.ts');
    const {followUpTemplateId}=load('lib/follow-up-template-slots.ts');
    const {ensureFollowUpTemplates}=load('lib/follow-up-template-store.ts');
    const filters={page:1,q:'',category:'',tag:'',favorites:false};
    let start=queries.length;let page=await readTemplateLibrary('owner',filters);
    assert.equal(page.total,2);assert.equal(queries.length-start,3,'first read initializes defaults once then rereads');
    const first=followUpTemplateId('owner',1),second=followUpTemplateId('owner',2);
    await pg`UPDATE message_templates SET body='Edited default 👋' WHERE id=${first}`;
    await pg`DELETE FROM message_templates WHERE id=${second}`;
    await readTemplateLibrary('owner',filters);
    assert.equal((await readTemplate('owner',first)).body,'Edited default 👋');
    await ensureFollowUpTemplates('owner',[]);
    assert.equal((await readTemplate('owner',first)).body,'Edited default 👋','racing initializer never overwrites an edited default');
    await pg`INSERT INTO message_templates(user_id,title,subject,body,category,tags,favorite,pinned,created_at)
      SELECT 'owner','Template '||lpad(g::text,3,'0'),'Subject '||g,
        CASE WHEN g=80 THEN repeat('👋abc',9990)||' hidden-body-needle' ELSE repeat('Message words ',500)||g END,
        CASE WHEN g%2=0 THEN 'Email' ELSE 'LinkedIn' END,jsonb_build_array(CASE WHEN g%3=0 THEN 'team' ELSE 'sales' END),g%4=0,g%10=0,
        '2026-01-01'::timestamp+g*interval '1 second' FROM generate_series(1,100)g`;
    const [other]=await pg`INSERT INTO message_templates(user_id,title,body,category,tags) VALUES('other','Private other','Other body','Other category','["other"]') RETURNING id`;
    await pg`INSERT INTO message_templates(user_id,title,body) VALUES('owner','Literal 100%_match','literal test')`;
    const source=await pg`SELECT * FROM message_templates WHERE user_id='owner'`;
    const expectedCategories=[...new Set(source.map(row=>row.category).filter(Boolean))].sort();
    const expectedTags=[...new Set(source.flatMap(row=>row.tags))].sort();
    let checks=0;
    for(const overrides of [{},{page:2},{page:900},{page:1e99},{page:Infinity},{page:NaN},{q:'hidden-body-needle'},{q:'Subject 20'},{q:'100%_'},{category:'Email'},{tag:'team'},{favorites:true},{q:'Message',category:'Email',tag:'sales',favorites:true},{q:'missing'}]){
      const f={...filters,...overrides};start=queries.length;page=await readTemplateLibrary('owner',f);
      assert.equal(queries.length-start,1,'steady-state library reads issue one SELECT and no insert');
      const matching=source.filter(row=>(!f.category||row.category===f.category)&&(!f.tag||row.tags.includes(f.tag))&&(!f.favorites||row.favorite)&&[row.title,row.subject,row.body,row.category,...row.tags].join(' ').toLowerCase().includes(f.q.toLowerCase()))
        .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Date.parse(b.created_at)-Date.parse(a.created_at)||a.id.localeCompare(b.id));
      const requested=Number.isFinite(f.page)?Math.max(1,Math.floor(f.page)||1):1;
      const current=Math.min(requested,Math.max(1,Math.ceil(matching.length/18)));
      assert.equal(page.currentPage,current);assert.equal(page.totalCount,matching.length);assert.equal(page.total,source.length);
      assert.deepEqual(page.categories,expectedCategories);assert.deepEqual(page.tags,expectedTags);
      assert.equal(page.favoriteCount,source.filter(row=>row.favorite).length);
      assert.deepEqual(page.items.map(row=>row.id),matching.slice((current-1)*18,current*18).map(row=>row.id));
      for(const item of page.items){const original=source.find(row=>row.id===item.id);assert.equal(item.characterCount,Array.from(original.body).length);assert.equal(item.body,Array.from(original.body).slice(0,1000).join(''));assert.equal(item.bodyTruncated,item.characterCount>1000);}
      checks++;
    }
    assert.equal(await readTemplate('owner',other.id),null);
    const needle=source.find(row=>row.title==='Template 080');
    assert.equal((await readTemplate('owner',needle.id)).body,needle.body,'owned full message remains intact');
    start=queries.length;
    const followUps=await load('actions/follow-up-templates.ts').getFollowUpTemplates();
    assert.equal(queries.length-start,1);assert.equal(followUps[0].body,'Edited default 👋');
    const protectedDelete=await load('actions/templates.ts').deleteTemplate(first);assert.match(protectedDelete.error,/linked/);
    const oldStart=performance.now();
    await pg`INSERT INTO message_templates(id,user_id,title,body) VALUES(${first},'owner','Default','Never replace') ON CONFLICT DO NOTHING`;
    const all=await pg`SELECT * FROM message_templates WHERE user_id='owner' ORDER BY pinned DESC,created_at DESC`;
    const oldMs=Math.round(performance.now()-oldStart);
    const newStart=performance.now();page=await readTemplateLibrary('owner',filters);const newMs=Math.round(performance.now()-newStart);
    const statement=queries.at(-1);
    const [plan]=await pg.unsafe(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${statement.query}`,statement.params);
    assert.ok(plan['QUERY PLAN'][0]['Execution Time']>=0);
    console.log(JSON.stringify({checks,templates:source.length,oldQueries:2,newQueries:1,oldMs,newMs,oldBytes:Buffer.byteLength(JSON.stringify(all)),newBytes:Buffer.byteLength(JSON.stringify(page)),maxPreviewCharacters:1000,maxCards:18,queryExecutionMs:plan['QUERY PLAN'][0]['Execution Time']}));
    throw rollback;
  });
}catch(error){if(error!==rollback)throw error;}finally{await client.end();}
console.log('Template SQL fixtures rolled back.');
