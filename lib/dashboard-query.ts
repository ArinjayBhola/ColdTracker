import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { outreach } from "@/db/schema";

type PageRow = Pick<typeof outreach.$inferSelect, "id" | "companyName" | "companyLink" | "roleTargeted" | "applicationSource" | "applicationUrl" | "applicationStatus" | "status" | "contacts"> & { createdAt: string; updatedAt: string; followUpSentAt: string | null };

// Read preferences, count and a clamped page in one snapshot/round trip. The
// non-materialized CTE lets PostgreSQL retain index access for count and paging.
export async function readDashboardPage(userId: string, page = 1, filter = "") {
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const rows = await db.execute<{ pageSize: number; currentPage: number; totalCount: string; items: PageRow[] }>(sql`
    WITH settings AS (
      SELECT CASE WHEN preferences #>> '{table,pageSize}' IN ('10','20','50')
                  THEN (preferences #>> '{table,pageSize}')::int ELSE 10 END AS page_size,
             CASE WHEN ${filter} IN ('ALL','EMAIL','LINKEDIN') THEN ${filter}
                  WHEN preferences #>> '{table,defaultMethod}' IN ('ALL','EMAIL','LINKEDIN')
                  THEN preferences #>> '{table,defaultMethod}' ELSE 'ALL' END AS method
      FROM "user" WHERE id = ${userId}
    ), filtered AS NOT MATERIALIZED (
      SELECT o.* FROM outreach o CROSS JOIN settings s
      WHERE o."userId" = ${userId}
        AND (s.method = 'ALL' OR coalesce(o.contacts->0->>'contactMethod', 'EMAIL') = s.method)
    ), totals AS (SELECT count(*) AS total FROM filtered), paging AS (
      SELECT page_size, total, least(${requestedPage}::bigint, greatest(1, (total + page_size - 1) / page_size)) AS current_page
      FROM settings CROSS JOIN totals
    )
    SELECT page_size AS "pageSize", current_page AS "currentPage", total AS "totalCount",
      coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."createdAt" DESC, p.id DESC) FROM (
        SELECT id, company_name AS "companyName", company_link AS "companyLink", role_targeted AS "roleTargeted",
               application_source AS "applicationSource", application_url AS "applicationUrl", application_status AS "applicationStatus",
               status, contacts, created_at AT TIME ZONE 'UTC' AS "createdAt", updated_at AT TIME ZONE 'UTC' AS "updatedAt",
               follow_up_sent_at AT TIME ZONE 'UTC' AS "followUpSentAt"
        FROM filtered ORDER BY created_at DESC, id DESC
        LIMIT (SELECT page_size FROM paging)
        OFFSET (SELECT (current_page - 1) * page_size FROM paging)
      ) p), '[]'::jsonb) AS items
    FROM paging
  `);
  const result = rows[0];
  return {
    pageSize: Number(result?.pageSize ?? 10), currentPage: Number(result?.currentPage ?? 1), totalCount: Number(result?.totalCount ?? 0),
    items: (result?.items ?? []).map(item => ({
      id: item.id, companyName: item.companyName, companyLink: item.companyLink, roleTargeted: item.roleTargeted,
      applicationSource: item.applicationSource, applicationUrl: item.applicationUrl, applicationStatus: item.applicationStatus,
      status: item.status, personName: item.contacts[0]?.personName || "No Contact", personRole: item.contacts[0]?.personRole || "N/A",
      messageSentAt: item.contacts[0]?.messageSentAt || new Date(item.createdAt), followUpDueAt: item.contacts[0]?.followUpDueAt || new Date(item.createdAt),
      followUpSentAt: item.followUpSentAt ? new Date(item.followUpSentAt) : null,
      contactMethod: item.contacts[0]?.contactMethod || "EMAIL", contactCount: item.contacts.length, contacts: item.contacts,
      date: new Date(item.createdAt), updatedAt: new Date(item.updatedAt),
    })),
  };
}
