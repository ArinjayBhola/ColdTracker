import { validBrowserDay, validTimeZone, type BrowserDay } from "@/lib/user-calendar";
import { db } from "@/db";
import type { OutreachContact } from "@/db/schema";
import { sql } from "drizzle-orm";

export type FollowUpFilters = { q?: string; method?: "ALL" | "EMAIL" | "LINKEDIN"; status?: string };

export async function getFollowUpPage(
  userId: string, category: "OVERDUE" | "TODAY" | "UPCOMING" | "SENT" | "ALL_ACTIVE",
  page = 1, limit = 15, stage: "ALL" | "1" | "2" = "ALL", timeZone?: string, browserDay?: BrowserDay,
  filters: FollowUpFilters = {},
) {
  if (!validTimeZone(timeZone) || !validBrowserDay(browserDay)) return { items: [], hasMore: false };
  const pageSize = Math.min(100, Math.max(1, Math.floor(limit) || 15));
  const offset = (Math.max(1, Math.floor(page) || 1) - 1) * pageSize;
  const conditions = [sql`f.user_id = ${userId}`];
  const query = filters.q?.trim().slice(0, 200) ?? "";
  const method = filters.method === "EMAIL" || filters.method === "LINKEDIN" ? filters.method : "ALL";
  const status = filters.status && filters.status !== "ALL" ? filters.status : "";
  const filtered = !!query || method !== "ALL" || !!status;
  const contact = sql`filter_o.contacts->f.contact_index`;
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(sql`(filter_o.company_name ILIKE ${pattern} OR coalesce(nullif(${contact}->>'personName', ''), 'No Contact') ILIKE ${pattern})`);
  }
  if (method !== "ALL") conditions.push(sql`coalesce(nullif(${contact}->>'contactMethod', ''), 'EMAIL') = ${method}`);
  if (status) conditions.push(sql`filter_o.status::text = ${status}`);
  if (stage !== "ALL") conditions.push(sql`f.stage = ${Number(stage)}`);
  if (category === "SENT") conditions.push(sql`f.completed_at IS NOT NULL`);
  else {
    conditions.push(sql`f.active AND f.pending AND f.due_at IS NOT NULL`);
    if (category === "OVERDUE") conditions.push(sql`f.due_at < ${browserDay!.start}::timestamptz`);
    if (category === "TODAY") conditions.push(sql`f.due_at >= ${browserDay!.start}::timestamptz AND f.due_at < ${browserDay!.end}::timestamptz`);
    if (category === "UPCOMING") conditions.push(sql`f.due_at >= ${browserDay!.end}::timestamptz`);
  }
  const rows = await db.execute<{
    id: string; companyName: string; roleTargeted: string; status: string;
    contact: OutreachContact; effectiveDue: string | null;
  }>(sql`
    WITH page AS MATERIALIZED (
      SELECT f.outreach_id, f.contact_index, f.contact_id, f.due_at, f.completed_at
      FROM outreach_follow_up_lookup f
      ${filtered ? sql`JOIN outreach filter_o ON filter_o.id = f.outreach_id AND filter_o."userId" = ${userId}` : sql``}
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY ${category === "SENT" ? sql`f.completed_at DESC` : sql`f.due_at ASC`}, f.outreach_id, f.contact_id
      LIMIT ${pageSize + 1} OFFSET ${offset}
    )
    SELECT o.id, o.company_name AS "companyName", o.role_targeted AS "roleTargeted", o.status,
      o.contacts->page.contact_index AS contact, page.due_at AS "effectiveDue"
    FROM page JOIN outreach o ON o.id = page.outreach_id AND o."userId" = ${userId}
    ORDER BY ${category === "SENT" ? sql`page.completed_at DESC` : sql`page.due_at ASC`}, page.outreach_id, page.contact_id
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
