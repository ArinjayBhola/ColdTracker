import postgres from "postgres";
import { randomUUID } from "node:crypto";
import core, { type TrackingRow } from "./email-tracking-core.cjs";

const globalTracking = globalThis as unknown as { emailTrackingSql?: ReturnType<typeof postgres> };
function collectorSql() {
  if (!globalTracking.emailTrackingSql) {
    const url = process.env.EMAIL_TRACKING_DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error("Tracking storage unavailable");
    globalTracking.emailTrackingSql = postgres(url, { prepare: false, max: 2, connect_timeout: 3,
      idle_timeout: 20, onnotice: () => {}, connection: { statement_timeout: 1500, lock_timeout: 500 } });
  }
  return globalTracking.emailTrackingSql;
}

export async function collectOpen(token: string, now = new Date().toISOString(), eventId = randomUUID()) {
  if (!core.tokenHash(token)) return false;
  return collectorSql().begin(async tx => core.recordOpen({
    lockToken: async hash => {
      // Fixed SQL + positional parameters; no request text is used as SQL.
      const rows = await tx.unsafe<TrackingRow[]>("SELECT id,tracking_enabled,delivery_state,created_at,open_count,first_open_at,last_open_at,window_start,window_count FROM public.outreach_email_messages WHERE token_hash=$1 FOR UPDATE", [hash]);
      return rows[0] || null;
    },
    insertEvent: async (id, message, observed) => (await tx.unsafe("INSERT INTO public.outreach_email_open_events (id,message_id,observed_at) VALUES ($1,$2,$3::timestamptz) ON CONFLICT (id) DO NOTHING RETURNING id", [id, message, observed])).length === 1,
    update: async (id, value) => { await tx.unsafe("UPDATE public.outreach_email_messages SET open_count=$1,first_open_at=$2::timestamptz,last_open_at=$3::timestamptz,window_start=$4::timestamptz,window_count=$5 WHERE id=$6", [value.open_count, value.first_open_at, value.last_open_at, value.window_start, value.window_count, id]); },
  }, token, now, eventId));
}

export function missingTrackingSchema(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01";
}
