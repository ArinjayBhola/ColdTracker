import { db } from "@/db";
import { sql } from "drizzle-orm";
import type { NotificationSummary } from "@/lib/notifications";

export async function readNotificationSummary(owner: string, oldest?: { at: string; id: string }): Promise<NotificationSummary> {
  // One statement gives a coherent snapshot without BEGIN/clock/page/count/COMMIT
  // round trips. Only the loaded time range is fingerprinted; old cleared rows
  // and JSONB contact/message content never need to be serialized or transferred.
  const [summary] = await db.execute<NotificationSummary>(sql`
    SELECT
      (SELECT count(*)::int FROM notifications
       WHERE user_id = ${owner} AND read_at IS NULL AND cleared_at IS NULL) AS "unreadCount",
      encode(sha256(convert_to(coalesce((
        SELECT string_agg(n.id::text || CASE WHEN n.read_at IS NULL THEN 'u' ELSE 'r' END ||
          to_char(o.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), E'\n' ORDER BY n.id)
        FROM notifications n INNER JOIN outreach o ON o.id = n.outreach_id AND o."userId" = ${owner}
        WHERE n.user_id = ${owner} AND n.cleared_at IS NULL
          AND ${oldest ? sql`(n.created_at, n.id) >= (${oldest.at}::timestamptz, ${oldest.id}::uuid)` : sql`true`}
      ), ''), 'UTF8')), 'hex') AS revision
  `);
  return summary;
}
