import { db } from "@/db";
import { calendarKey, calendarMidnight, shiftCalendarKey } from "@/lib/user-calendar";
import { sql } from "drizzle-orm";
import type { outreach } from "@/db/schema";

type PageRow = Pick<typeof outreach.$inferSelect, "id" | "companyName" | "companyLink" | "roleTargeted" | "applicationSource" | "applicationUrl" | "applicationStatus" | "status" | "contacts"> & { isAutomated: boolean; createdAt: string; updatedAt: string; followUpSentAt: string | null; followUp2DueAt: string | null; followUp2SentAt: string | null };

// Read preferences, count and a clamped page in one snapshot/round trip. The
// non-materialized CTE lets PostgreSQL retain index access for count and paging.
export type DashboardFilters = { q?: string; start?: string; end?: string; timeZone?: string; origin?: string };

export async function readDashboardPage(userId: string, page = 1, filter = "", options: DashboardFilters = {}) {
  const activeFilter = ["ALL", "EMAIL", "LINKEDIN"].includes(filter) ? filter : filter ? "ALL" : "";
  const requestedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const query = options.q?.trim().slice(0, 200) ?? "";
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const validDate = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const start = validDate(options.start) ? options.start : undefined;
  const end = validDate(options.end) ? options.end : undefined;
  const zone = options.timeZone ?? "UTC";
  const automated = sql`EXISTS (SELECT 1 FROM automation_outreach_events ae WHERE ae.user_id = o."userId" AND ae.outreach_id = o.id)`;
  const originCondition = options.origin === "AUTOMATED" ? automated : options.origin === "MANUAL" ? sql`NOT (${automated})` : sql`true`;
  const sent = sql`coalesce(nullif(c->>'messageSentAt', '')::timestamptz, o.created_at AT TIME ZONE 'UTC')`;
  const dateConditions = [sql`true`];
  if (start) dateConditions.push(sql`${sent} >= ${calendarMidnight(start, zone).toISOString()}::timestamptz`);
  if (end) dateConditions.push(sql`${sent} < ${calendarMidnight(shiftCalendarKey(end, 1), zone).toISOString()}::timestamptz`);
  const rows = await db.execute<{ pageSize: number; currentPage: number; totalCount: string; method: string; items: PageRow[] }>(sql`
    WITH settings AS (
      SELECT CASE WHEN preferences #>> '{table,pageSize}' IN ('10','20','50')
                  THEN (preferences #>> '{table,pageSize}')::int ELSE 10 END AS page_size,
             CASE WHEN ${activeFilter} IN ('ALL','EMAIL','LINKEDIN') THEN ${activeFilter}
                  WHEN preferences #>> '{table,defaultMethod}' IN ('ALL','EMAIL','LINKEDIN')
                  THEN preferences #>> '{table,defaultMethod}' ELSE 'ALL' END AS method
      FROM "user" WHERE id = ${userId}
    ), filtered AS NOT MATERIALIZED (
      SELECT o.*, ${automated} AS "isAutomated" FROM outreach o CROSS JOIN settings s
      WHERE o."userId" = ${userId}
        AND ${originCondition}
        AND (${query === ""} OR o.company_name ILIKE ${pattern} OR o.role_targeted ILIKE ${pattern}
          OR EXISTS (SELECT 1 FROM jsonb_array_elements(o.contacts) c WHERE c->>'personName' ILIKE ${pattern}))
        AND ((s.method = 'ALL' AND ${!start && !end}) OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(o.contacts) c
          WHERE (s.method = 'ALL' OR c->>'contactMethod' = s.method)
            AND ${sql.join(dateConditions, sql` AND `)}
            AND (${query === ""} OR o.company_name ILIKE ${pattern} OR o.role_targeted ILIKE ${pattern} OR c->>'personName' ILIKE ${pattern})
        ))
    ), totals AS (SELECT count(*) AS total FROM filtered), paging AS (
      SELECT page_size, method, total, least(${requestedPage}::bigint, greatest(1, (total + page_size - 1) / page_size)) AS current_page
      FROM settings CROSS JOIN totals
    )
    SELECT method, page_size AS "pageSize", current_page AS "currentPage", total AS "totalCount",
      coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p."createdAt" DESC, p.id DESC) FROM (
        SELECT id, company_name AS "companyName", company_link AS "companyLink", role_targeted AS "roleTargeted",
               application_source AS "applicationSource", application_url AS "applicationUrl", application_status AS "applicationStatus",
               status, contacts, "isAutomated", created_at AT TIME ZONE 'UTC' AS "createdAt", updated_at AT TIME ZONE 'UTC' AS "updatedAt",
               follow_up_sent_at AT TIME ZONE 'UTC' AS "followUpSentAt",
               follow_up_2_due_at AT TIME ZONE 'UTC' AS "followUp2DueAt", follow_up_2_sent_at AT TIME ZONE 'UTC' AS "followUp2SentAt"
        FROM filtered ORDER BY created_at DESC, id DESC
        LIMIT (SELECT page_size FROM paging)
        OFFSET (SELECT (current_page - 1) * page_size FROM paging)
      ) p), '[]'::jsonb) AS items
    FROM paging
  `);
  const result = rows[0];
  return {
    timeZone: zone,
    pageSize: Number(result?.pageSize ?? 10), currentPage: Number(result?.currentPage ?? 1), totalCount: Number(result?.totalCount ?? 0),
    items: (result?.items ?? []).map(item => {
      const selected = item.contacts.find(contact => {
        const activeMethod = result?.method || activeFilter || "ALL";
        if (activeMethod !== "ALL" && contact.contactMethod !== activeMethod) return false;
        if (query && !item.companyName.toLowerCase().includes(query.toLowerCase()) && !item.roleTargeted.toLowerCase().includes(query.toLowerCase()) && !contact.personName?.toLowerCase().includes(query.toLowerCase())) return false;
        const day = calendarKey(contact.messageSentAt || item.createdAt, zone);
        return (!start || day >= start) && (!end || day <= end);
      }) ?? item.contacts[0];
      const finished = item.followUp2SentAt || ["DRAFT", "REPLIED", "OFFER", "REJECTED", "CLOSED"].includes(item.status);
      const firstDue = item.contacts.map(contact => contact.followUpDueAt).filter((value): value is string | Date => !!value).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      return ({
      id: item.id, isAutomated: item.isAutomated, companyName: item.companyName, companyLink: item.companyLink, roleTargeted: item.roleTargeted,
      applicationSource: item.applicationSource, applicationUrl: item.applicationUrl, applicationStatus: item.applicationStatus,
      status: item.status, personName: selected?.personName || "No Contact", personRole: selected?.personRole || "N/A",
      messageSentAt: selected?.messageSentAt || new Date(item.createdAt), followUpDueAt: finished ? null : item.followUpSentAt ? item.followUp2DueAt : firstDue ?? null,
      followUpSentAt: item.followUpSentAt ? new Date(item.followUpSentAt) : null,
      contactMethod: selected?.contactMethod || "EMAIL", contactCount: item.contacts.length, contacts: item.contacts,
      date: new Date(item.createdAt), updatedAt: new Date(item.updatedAt),
    }); }),
  };
}
