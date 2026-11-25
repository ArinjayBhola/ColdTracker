// Local production measurements using disposable records; no emails or migrations.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { encode } from "next-auth/jwt";
import postgres from "postgres";
const base=process.env.TEMPLATE_TEST_URL||"http://localhost:3000";
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local server required');
const owner='template-measure-'+randomUUID();
const pg=postgres(process.env.DATABASE_URL,{prepare:false,max:1,onnotice(){}});
try{
  await pg`INSERT INTO public."user"(id,email,receive_notifications) VALUES(${owner},${owner+'@example.invalid'},false)`;
  await pg`INSERT INTO public.message_templates(user_id,title,body,category,tags)
    SELECT ${owner},'Template '||lpad(g::text,3,'0'),left(repeat('Message content for a growing template library. ',300),10000),'Example','["test"]'::jsonb FROM generate_series(1,120)g`;
  const token=await encode({token:{sub:owner},secret:process.env.AUTH_SECRET||process.env.NEXTAUTH_SECRET,salt:'authjs.session-token',maxAge:600});
  const headers={cookie:`authjs.session-token=${token}`};const times=[];let html;
  for(let i=0;i<3;i++){const start=performance.now();const response=await fetch(base+'/templates',{headers});html=await response.text();assert.equal(response.status,200);times.push(Math.round(performance.now()-start));}
  const sources=[...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]))];
  const chunks=await Promise.all(sources.map(async source=>Buffer.from(await(await fetch(new URL(source,base))).arrayBuffer())));
  const result={templates:122,messageCharacters:10000,responseTimesMs:times,htmlBytes:Buffer.byteLength(html),scriptChunks:chunks.length,scriptBytes:chunks.reduce((sum,chunk)=>sum+chunk.length,0),scriptGzipBytes:chunks.reduce((sum,chunk)=>sum+gzipSync(chunk).length,0)};
  if(process.argv.includes('--baseline'))await writeFile(path.join(tmpdir(),'coldtrack-template-baseline.json'),JSON.stringify(result));
  console.log(JSON.stringify(result));
}finally{await pg`DELETE FROM public."user" WHERE id=${owner}`;await pg.end();console.log('Disposable template measurement account removed.');}
