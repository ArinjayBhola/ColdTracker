import { validBrowserDay, validTimeZone, type BrowserDay } from "@/lib/user-calendar";
import { db } from "@/db";
import type { OutreachContact } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getFollowUpPage(
  userId: string, category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE",
  page = 1, limit = 15, stage: "ALL" | "1" | "2" = "ALL", timeZone?: string, browserDay?: BrowserDay,
) {
  if (!validTimeZone(timeZone) || !validBrowserDay(browserDay)) return { items: [], hasMore: false };
  const pageSize = Math.min(100, Math.max(1, Math.floor(limit) || 15));
  const offset = (Math.max(1, Math.floor(page) || 1) - 1) * pageSize;
  const due = sql`CASE WHEN nullif(c->>'followUpSentAt', '') IS NOT NULL
    THEN nullif(c->>'followUp2DueAt', '')::timestamptz ELSE nullif(c->>'followUpDueAt', '')::timestamptz END`;
  const conditions = [sql`o."userId" = ${userId}`];
  if (stage === "1") conditions.push(sql`nullif(c->>'followUpSentAt', '') IS NULL`);
  if (stage === "2") conditions.push(sql`nullif(c->>'followUpSentAt', '') IS NOT NULL`);
  if (category === "SENT") conditions.push(sql`nullif(c->>'followUp2SentAt', '') IS NOT NULL`);
  else {
    conditions.push(sql`o.status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED')`);
    conditions.push(sql`nullif(c->>'followUp2SentAt', '') IS NULL AND ${due} IS NOT NULL`);
    if (category === "OVERDUE") conditions.push(sql`${due} < ${browserDay!.start}::timestamptz`);
    if (category === "TODAY") conditions.push(sql`${due} >= ${browserDay!.start}::timestamptz AND ${due} < ${browserDay!.end}::timestamptz`);
    if (category === "UPCOMING") conditions.push(sql`${due} >= ${browserDay!.end}::timestamptz`);
  }
  const rows = await db.execute<{
    id: string; companyName: string; roleTargeted: string; status: string;
    contact: OutreachContact; effectiveDue: string | null;
  }>(sql`
    SELECT o.id, o.company_name AS "companyName", o.role_targeted AS "roleTargeted", o.status,
      c AS contact, ${due} AS "effectiveDue"
    FROM outreach o CROSS JOIN LATERAL jsonb_array_elements(o.contacts) c
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY ${category === "SENT" ? sql`(c->>'followUp2SentAt')::timestamptz DESC` : sql`${due} ASC`}, o.id, c->>'id'
    LIMIT ${pageSize + 1} OFFSET ${offset}
  `);
  return {
    hasMore: rows.length > pageSize,
    items: rows.slice(0, pageSize).map(row => ({
      id: row.id, contactId: row.contact.id!, companyName: row.companyName, roleTargeted: row.roleTargeted,
      status: row.status, personName: row.contact.personName || "No Contact",
      followUpDueAt: row.effectiveDue, contactMethod: row.contact.contactMethod || "EMAIL",
      followUpSentAt: row.contact.followUpSentAt ?? null, followUp2SentAt: row.contact.followUp2SentAt ?? null,
      contacts: [row.contact],
    })),
  };
}
