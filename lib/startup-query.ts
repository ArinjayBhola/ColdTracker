import { db } from "@/db";
import { sql } from "drizzle-orm";
import { TEAM_SIZE_FILTERS } from "@/lib/startup-team-size";

export type StartupListItem = {
  id: string; name: string; description: string | null; website: string | null; logoUrl: string | null;
  sector: string | null; location: string | null; teamSize: string | null; fundingAmount: string | null;
  isHiring: boolean | null; isTrending: boolean | null; updatedAt: string;
  tracking: { outreachDone: boolean }[];
};
export type StartupTeamPreview = {
  employeeCount: number;
  employees: { id: string; name: string; role: string | null; email: string | null; linkedinUrl: string | null }[];
};

export async function readStartupPage(owner: string, page = 1, pageSize = 20, search = "", sort = "NOT_OUTREACHED", teamSize = "all") {
  const selectedTeamSize = TEAM_SIZE_FILTERS.some(filter => filter.value === teamSize) ? teamSize : "all";
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(50, Math.max(1, Math.floor(pageSize))) : 20;
  const value = search.trim().slice(0, 200);
  const pattern = `%${value}%`;
  const matches = value ? sql`(s.name ILIKE ${pattern} OR s.description ILIKE ${pattern} OR s.sector ILIKE ${pattern})` : sql`true`;
  const name = sql`lower(s.name)`;
  const contacted = sql`coalesce(t.outreach_done, false)`;
  const ordering = sort === "OUTREACHED" ? sql`${contacted} DESC, ${name} ASC`
    : sort === "A_Z" ? sql`${name} ASC` : sort === "Z_A" ? sql`${name} DESC` : sql`${contacted} ASC, ${name} ASC`;
  // Match JavaScript trim/\s, dash normalization, and comma removal exactly.
  const whitespace = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";
  const [result] = await db.execute<{
    items: StartupListItem[]; totalCount: number; total: number; done: number; sizes: { value: string; count: number }[];
  }>(sql`
    WITH size_counts AS MATERIALIZED (
      SELECT coalesce(s.team_size, '') AS size, count(*)::int AS count FROM startups s WHERE ${matches} GROUP BY 1
    ), normalized_sizes AS (
      SELECT *, btrim(translate(size, ${whitespace + "–—,"}, ${" ".repeat(whitespace.length) + "--"})) AS normalized FROM size_counts
    ), size_values AS (
      SELECT *, CASE WHEN normalized ~ '^(?:[0-9]+ *- *)?[0-9]+$' OR normalized ~ '^< *[0-9]+$'
        THEN substring(normalized FROM '([0-9]+)$')::numeric END AS upper_size FROM normalized_sizes
    ), size_groups AS MATERIALIZED (
      SELECT size, count, CASE WHEN normalized ~ '^[0-9]+ *\\+$' THEN 'open'
        WHEN upper_size <= 10 THEN '1-10' WHEN upper_size <= 50 THEN '11-50'
        WHEN upper_size <= 200 THEN '51-200' WHEN upper_size <= 500 THEN '201-500'
        WHEN upper_size <= 1000 THEN '501-1000' WHEN upper_size > 1000 THEN '1001+' ELSE 'other' END AS bucket
      FROM size_values
    ), page AS (
      SELECT s.id, s.name, s.description, s.website, s.logo_url AS "logoUrl", s.sector, s.location,
        s.team_size AS "teamSize", s.funding_amount AS "fundingAmount", s.is_hiring AS "isHiring", s.is_trending AS "isTrending",
        to_char(s.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "updatedAt",
        CASE WHEN t.id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('outreachDone',t.outreach_done)) END AS tracking,
        coalesce(t.outreach_done,false) AS contacted
      FROM startups s LEFT JOIN startup_tracking t ON t.startup_id = s.id AND t.user_id = ${owner}
      ${selectedTeamSize === "all" ? sql`` : sql`JOIN size_groups g ON g.size = coalesce(s.team_size,'') AND g.bucket = ${selectedTeamSize}`}
      WHERE ${matches} ORDER BY ${ordering}, s.id ASC LIMIT ${safePageSize} OFFSET ${(safePage - 1) * safePageSize}
    )
    SELECT coalesce((SELECT jsonb_agg(to_jsonb(p) - 'contacted' ORDER BY
      ${sort === "OUTREACHED" ? sql`p.contacted DESC, lower(p.name) ASC` : sort === "A_Z" ? sql`lower(p.name) ASC` : sort === "Z_A" ? sql`lower(p.name) DESC` : sql`p.contacted ASC, lower(p.name) ASC`}, p.id ASC) FROM page p),'[]'::jsonb) AS items,
      (SELECT coalesce(sum(count),0)::int FROM size_groups WHERE ${selectedTeamSize === "all" ? sql`true` : sql`bucket = ${selectedTeamSize}`}) AS "totalCount",
      (SELECT coalesce(jsonb_agg(jsonb_build_object('value',bucket,'count',count)),'[]'::jsonb)
        FROM (SELECT bucket,sum(count)::int AS count FROM size_groups GROUP BY bucket) sizes) AS sizes,
      count(*)::int AS total, count(*) FILTER (WHERE t.outreach_done = true)::int AS done
    FROM startups s LEFT JOIN startup_tracking t ON t.startup_id = s.id AND t.user_id = ${owner}
  `);
  return {
    items: result.items, totalCount: result.totalCount, selectedTeamSize,
    teamSizeCounts: TEAM_SIZE_FILTERS.map(filter => ({ ...filter, count: result.sizes.find(size => size.value === filter.value)?.count ?? 0 })),
    summary: { total: result.total, done: result.done, left: result.total - result.done },
  };
}

export async function readStartupTeamPreviews(ids: string[]): Promise<Record<string, StartupTeamPreview>> {
  if (!ids.length) return {};
  const rows = await db.execute<{ id: string; employeeCount: number; employees: StartupTeamPreview["employees"] }>(sql`
    SELECT s.id,
      (SELECT count(*)::int FROM startup_employees e WHERE e.startup_id = s.id) AS "employeeCount",
      coalesce((SELECT jsonb_agg(to_jsonb(member) - 'createdAt' ORDER BY member."createdAt",member.id) FROM (
        SELECT e.id,e.name,e.role,e.email,e.linkedin_url AS "linkedinUrl",e.created_at AS "createdAt"
        FROM startup_employees e WHERE e.startup_id = s.id ORDER BY e.created_at,e.id LIMIT 2
      ) member),'[]'::jsonb) AS employees
    FROM startups s WHERE s.id = ANY(${`{${ids.join(",")}}`}::uuid[])
  `);
  return Object.fromEntries(rows.map(({ id, ...preview }) => [id, preview]));
}
