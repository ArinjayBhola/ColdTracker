-- Run with npm run db:migrate:automation-index, outside a transaction.
-- Concurrent creation keeps automation writes available while the index builds.
CREATE INDEX CONCURRENTLY IF NOT EXISTS automation_outreach_events_owner_outreach_idx
  ON public.automation_outreach_events (user_id, outreach_id);
