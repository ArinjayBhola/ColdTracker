// Exercise the real queries in an isolated, rollback-only PostgreSQL schema.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { PgDialect } from "drizzle-orm/pg-core";
import createLoader from "./reliability-test-loader.cjs";

const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice() {} });
const namespace = `startup_check_${randomUUID().replaceAll("-", "")}`;
const rollback = new Error("ROLLBACK_STARTUP_CHECK");
try {
  await client.begin(async pg => {
    await pg.unsafe(`CREATE SCHEMA "${namespace}"; SET LOCAL search_path TO "${namespace}", pg_catalog; SET LOCAL statement_timeout = '30s'`);
    for (const table of ["startups", "startup_tracking", "startup_employees"]) await pg.unsafe(`CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING INDEXES)`);
    const sizes = [null, "", "1-10", "11 - 50", "51\u2013200", "201\u2014500", "501-1,000", "1,001", "100+", "< 10", "unknown", "\u00a011\t-\n50\ufeff", "0", "1 0", "1 - 10 ", "50\u202f+", "9".repeat(255), "1-00050"];
    for (let index = 0; index < sizes.length; index++) {
      const [item] = await pg`INSERT INTO startups(name,team_size,description,sector)
        VALUES (${"Fixture " + String(index).padStart(2,"0")},${sizes[index]},${index % 2 ? "search needle" : "plain"},'Technology') RETURNING id`;
      await pg`INSERT INTO startup_tracking(user_id,startup_id,outreach_done,notes) VALUES ('other',${item.id},true,'private other notes')`;
      if (index % 3) await pg`INSERT INTO startup_tracking(user_id,startup_id,outreach_done,notes) VALUES ('owner',${item.id},${index % 3 === 1},'private owner notes')`;
      await pg`INSERT INTO startup_employees(startup_id,name,email,created_at)
        SELECT ${item.id},'Member '||g,'member'||g||'@example.invalid','2026-01-01'::timestamp + g * interval '1 second' FROM generate_series(1,100)g`;
    }
    const source = await pg`SELECT s.*,coalesce(t.outreach_done,false) contacted,t.id AS tracking_id FROM startups s
      LEFT JOIN startup_tracking t ON t.startup_id=s.id AND t.user_id='owner' ORDER BY lower(s.name),s.id`;
    const { TEAM_SIZE_FILTERS, startupTeamSizeGroup } = createLoader()("lib/startup-team-size.ts");
    pg.options = client.options;
    const database = drizzle(pg);
    const queries = [];
    const db = { execute(query) { queries.push(new PgDialect().sqlToQuery(query).sql); return database.execute(query); } };
    const { readStartupPage, readStartupTeamPreviews } = createLoader({ "@/db": { db } })("lib/startup-query.ts");
    let checks = 0;
    async function compare({ search = "", sort = "NOT_OUTREACHED", size = "all", page = 1, limit = 7, owner = "owner" } = {}) {
      const matches = source.filter(row => !search || [row.name,row.description,row.sector].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));
      const selectedSize = TEAM_SIZE_FILTERS.some(filter => filter.value === size) ? size : "all";
      const filtered = matches.filter(row => selectedSize === "all" || startupTeamSizeGroup(row.team_size) === selectedSize);
      const normalizedSort = ["OUTREACHED","A_Z","Z_A"].includes(sort) ? sort : "NOT_OUTREACHED";
      const isDone = row => owner === "other" || (owner === "owner" && row.contacted);
      filtered.sort((a,b) => {
        const alpha = a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        if (normalizedSort === "A_Z") return alpha;
        if (normalizedSort === "Z_A") return -a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        return (Number(isDone(a))-Number(isDone(b))) * (normalizedSort === "OUTREACHED" ? -1 : 1) || alpha;
      });
      const safeLimit = Number.isFinite(limit) ? Math.min(50,Math.max(1,Math.floor(limit))) : 20;
      const safePage = Number.isFinite(page) ? Math.max(1,Math.floor(page)) : 1;
      const start = (safePage-1)*safeLimit;
      const before = queries.length;
      const result = await readStartupPage(owner,page,limit,search,sort,size);
      assert.equal(queries.length-before,1,"list and all metadata use one SQL statement");
      assert.equal(queries.at(-1).includes("startup_employees"),false,"grid query never loads employees");
      const expected = filtered.slice(start,start+safeLimit);
      assert.deepEqual(result.items.map(row => row.id),expected.map(row=>row.id),JSON.stringify({search,sort,size,page,limit,owner}));
      assert.equal(result.totalCount,filtered.length);
      assert.equal(result.selectedTeamSize,selectedSize);
      assert.deepEqual(result.teamSizeCounts,TEAM_SIZE_FILTERS.map(filter=>({...filter,count:matches.filter(row=>startupTeamSizeGroup(row.team_size)===filter.value).length})));
      const done = source.filter(isDone).length;
      assert.deepEqual(result.summary,{total:source.length,done,left:source.length-done});
      for (const [index,item] of result.items.entries()) {
        const row = expected[index];
        assert.deepEqual(item.tracking,owner === "other" ? [{outreachDone:true}] : owner === "owner" && row.tracking_id ? [{outreachDone:row.contacted}] : []);
        assert.ok(!("employees" in item) && !("fundingDate" in item));
        assert.equal(item.name,row.name);
        assert.equal(item.teamSize,row.team_size);
        assert.ok(Number.isFinite(Date.parse(item.updatedAt)));
      }
      checks++;
    }
    for (const size of ["all",...TEAM_SIZE_FILTERS.map(filter=>filter.value),"invalid"]) for (const search of ["","needle"]) await compare({size,search});
    for (const sort of ["OUTREACHED","A_Z","Z_A","invalid"]) for (const page of [1,2,9]) await compare({sort,page});
    for (const owner of ["other","unknown"]) await compare({owner});
    for (const [page,limit] of [[-2,0],[NaN,Infinity],[1,500],[1.9,3.9]]) await compare({page,limit});
    const ids = source.slice(0,7).map(row=>row.id);
    const previews = await readStartupTeamPreviews(ids);
    for (const id of ids) {
      assert.equal(previews[id].employeeCount,100);
      assert.deepEqual(previews[id].employees.map(member=>member.name),["Member 1","Member 2"]);
    }
    assert.deepEqual(await readStartupTeamPreviews([randomUUID()]),{});
    const count = queries.length;
    assert.deepEqual(await readStartupTeamPreviews([]),{}); assert.equal(queries.length,count);
    // The old list path: size grouping, page+summary, then all employee rows.
    async function oldPage() {
      await pg`SELECT team_size,count(*)::int FROM startups GROUP BY team_size`;
      const [rows] = await Promise.all([
        pg`SELECT s.*,t.outreach_done FROM startups s LEFT JOIN startup_tracking t ON t.startup_id=s.id AND t.user_id='owner'
          ORDER BY coalesce(t.outreach_done,false),lower(s.name),s.id LIMIT 7`,
        pg`SELECT count(*)::int,count(*) FILTER(WHERE t.outreach_done=true)::int FROM startups s LEFT JOIN startup_tracking t ON t.startup_id=s.id AND t.user_id='owner'`,
      ]);
      const employees = await pg`SELECT * FROM startup_employees WHERE startup_id IN ${pg(rows.map(row=>row.id))}`;
      return rows.map(row=>({...row,employees:employees.filter(member=>member.startup_id===row.id)}));
    }
    const oldTimes = [], newTimes = [];
    let oldItems, newItems;
    for (let i=0;i<3;i++) {
      let start=performance.now(); oldItems=await oldPage(); oldTimes.push(Math.round(performance.now()-start));
      start=performance.now(); newItems=(await readStartupPage("owner",1,7)).items; newTimes.push(Math.round(performance.now()-start));
    }
    console.log(JSON.stringify({checks,companies:source.length,employeesPerCompany:100,oldQueryCount:4,newQueryCount:1,oldTimesMs:oldTimes,newTimesMs:newTimes,oldItemBytes:Buffer.byteLength(JSON.stringify(oldItems)),newItemBytes:Buffer.byteLength(JSON.stringify(newItems)),previewMembersPerCompany:2}));
    throw rollback;
  });
} catch(error) { if(error!==rollback) throw error; }
finally { await client.end(); }
console.log("Startup query checks passed; fixture schema rolled back.");
