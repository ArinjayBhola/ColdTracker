import { db } from "@/db";
import { sql } from "drizzle-orm";
import { parsePreferences } from "@/lib/preferences";
import { calendarMidnight, shiftCalendarKey, userDayBounds } from "@/lib/user-calendar";
import { buildGoalProgress } from "@/lib/goal-progress";
import { buildCohortAnalytics, type StatsCohort, type StatsSnapshot } from "@/lib/stats-summary";

export async function readStatsSnapshot(owner: string, timeZone: string, asOf = new Date().toISOString()): Promise<StatsSnapshot> {
  const day = userDayBounds(timeZone, new Date(asOf));
  // Project JSONB once inside PostgreSQL. Reuse the compact facts for cohort
  // metrics and creation-date goal counts in the same statement/snapshot.
  const [result] = await db.execute<{
    cohorts: StatsCohort[]; activities: { date: string; outreachCount: number }[];
    preferences: unknown; dailyTarget: number; weeklyTarget: number; totalRecords: number; nextFuture: string | null;
  }>(sql`
    WITH facts AS MATERIALIZED (
      SELECT o.created_at, o.status,
        CASE WHEN o.status <> 'DRAFT' OR coalesce(h.sent, false) THEN coalesce(c.first_sent, o.created_at AT TIME ZONE 'UTC')
             ELSE o.created_at AT TIME ZONE 'UTC' END AS metric_at,
        o.status <> 'DRAFT' OR coalesce(h.sent, false) AS sent,
        o.status IN ('REPLIED','INTERVIEW','OFFER') OR coalesce(h.responded, false) AS responded,
        o.status IN ('INTERVIEW','OFFER') OR coalesce(h.interviews, false) AS interviews,
        o.status = 'OFFER' OR coalesce(h.offers, false) AS offers,
        c.due < ${day.start.toISOString()}::timestamptz AS overdue,
        CASE WHEN c.methods > 1 THEN 'Mixed' WHEN c.email THEN 'Email' WHEN c.linkedin THEN 'LinkedIn' ELSE 'Unspecified' END AS channel
      FROM outreach o
      CROSS JOIN LATERAL (
        SELECT
          min(CASE WHEN contact->>'messageSentAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([Tt ]|$)' AND pg_input_is_valid(nullif(contact->>'messageSentAt', ''), 'timestamp with time zone')
                   THEN (contact->>'messageSentAt')::timestamptz END) AS first_sent,
          min(CASE WHEN nullif(contact->>'followUp2SentAt', '') IS NULL THEN
            CASE WHEN nullif(contact->>'followUpSentAt', '') IS NOT NULL THEN
              CASE WHEN contact->>'followUp2DueAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([Tt ]|$)' AND pg_input_is_valid(nullif(contact->>'followUp2DueAt', ''), 'timestamp with time zone') THEN (contact->>'followUp2DueAt')::timestamptz END
            ELSE CASE WHEN contact->>'followUpDueAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([Tt ]|$)' AND pg_input_is_valid(nullif(contact->>'followUpDueAt', ''), 'timestamp with time zone') THEN (contact->>'followUpDueAt')::timestamptz END END END) AS due,
          count(DISTINCT nullif(contact->>'contactMethod', '')) AS methods,
          bool_or(contact->>'contactMethod' = 'EMAIL') AS email, bool_or(contact->>'contactMethod' = 'LINKEDIN') AS linkedin
        FROM jsonb_array_elements(o.contacts) contact
      ) c
      CROSS JOIN LATERAL (
        SELECT bool_or(event->>'status' IN ('SENT','REPLIED','INTERVIEW','OFFER','REJECTED','GHOSTED','CLOSED')) AS sent,
          bool_or(event->>'status' IN ('REPLIED','INTERVIEW','OFFER')) AS responded,
          bool_or(event->>'status' IN ('INTERVIEW','OFFER')) AS interviews, bool_or(event->>'status' = 'OFFER') AS offers
        FROM jsonb_array_elements(o.status_history) event
      ) h
      WHERE o."userId" = ${owner}
    ), cohorts AS (
      SELECT to_char(metric_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day, channel,
        count(*) FILTER (WHERE sent)::int AS sent, count(*) FILTER (WHERE sent AND responded)::int AS responded,
        count(*) FILTER (WHERE sent AND interviews)::int AS interviews, count(*) FILTER (WHERE sent AND offers)::int AS offers,
        count(*) FILTER (WHERE status = 'DRAFT')::int AS drafts,
        count(*) FILTER (WHERE sent AND status IN ('SENT','GHOSTED'))::int AS awaiting,
        count(*) FILTER (WHERE sent AND status IN ('SENT','GHOSTED') AND overdue)::int AS overdue,
        count(*) FILTER (WHERE status <> 'DRAFT')::int AS selectable,
        jsonb_build_object('DRAFT', count(*) FILTER (WHERE status = 'DRAFT'), 'SENT', count(*) FILTER (WHERE status = 'SENT'),
          'REPLIED', count(*) FILTER (WHERE status = 'REPLIED'), 'INTERVIEW', count(*) FILTER (WHERE status = 'INTERVIEW'),
          'OFFER', count(*) FILTER (WHERE status = 'OFFER'), 'REJECTED', count(*) FILTER (WHERE status = 'REJECTED'),
          'GHOSTED', count(*) FILTER (WHERE status = 'GHOSTED'), 'CLOSED', count(*) FILTER (WHERE status = 'CLOSED')) AS statuses
      FROM facts WHERE metric_at <= ${asOf}::timestamptz GROUP BY 1, 2
    ), activities AS (
      SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS date,
        count(*)::int AS "outreachCount" FROM facts GROUP BY 1
    )
    SELECT coalesce((SELECT jsonb_agg(to_jsonb(cohorts) ORDER BY day, channel) FROM cohorts), '[]'::jsonb) AS cohorts,
      coalesce((SELECT jsonb_agg(to_jsonb(activities) ORDER BY date) FROM activities), '[]'::jsonb) AS activities,
      (SELECT preferences FROM "user" WHERE id = ${owner}) AS preferences,
      coalesce((SELECT daily_target FROM goals WHERE user_id = ${owner} LIMIT 1), 3) AS "dailyTarget",
      coalesce((SELECT weekly_target FROM goals WHERE user_id = ${owner} LIMIT 1), 10) AS "weeklyTarget",
      (SELECT count(*)::int FROM facts) AS "totalRecords",
      (SELECT min(metric_at) FROM facts WHERE metric_at > ${asOf}::timestamptz) AS "nextFuture"
  `);
  const counts = new Map<string, number>();
  const years = new Set([Number(day.key.slice(0, 4))]);
  for (const cohort of result.cohorts) {
    if (cohort.sent) counts.set(cohort.day, (counts.get(cohort.day) ?? 0) + cohort.sent);
    if (cohort.selectable) years.add(Number(cohort.day.slice(0, 4)));
  }
  const midnight = +calendarMidnight(shiftCalendarKey(day.key, 1), timeZone);
  return {
    asOf, timeZone, preferences: parsePreferences(result.preferences).stats,
    nextUpdateAt: new Date(Math.min(midnight, result.nextFuture ? +new Date(result.nextFuture) : midnight)).toISOString(),
    analytics: {
      "7": buildCohortAnalytics(result.cohorts, "7", asOf, timeZone), "30": buildCohortAnalytics(result.cohorts, "30", asOf, timeZone),
      "90": buildCohortAnalytics(result.cohorts, "90", asOf, timeZone), all: buildCohortAnalytics(result.cohorts, "all", asOf, timeZone),
    },
    heatmap: { counts: [...counts].map(([day, count]) => ({ day, count })), years: [...years].sort((a, b) => b - a) },
    goals: buildGoalProgress(result.activities, result, day.key), totalRecords: result.totalRecords,
  };
}
