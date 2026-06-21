-- Performance index tuning.
-- Idempotent: safe to run directly against the DB (Neon SQL editor / psql) or via `npm run db:push`.

-- outreach: drop redundant overlapping indexes. The composite
-- (user_id, status, created_at) index already serves (user_id) and
-- (user_id, status) lookups via its leftmost prefix.
DROP INDEX IF EXISTS "outreach_user_id_idx";
DROP INDEX IF EXISTS "outreach_user_id_status_idx";
DROP INDEX IF EXISTS "outreach_created_at_idx";

-- outreach: add (user_id, created_at) for the default dashboard list / export
-- (WHERE user_id ORDER BY created_at DESC).
CREATE INDEX IF NOT EXISTS "outreach_user_id_created_at_idx"
  ON "outreach" ("userId", "created_at");

-- Keep the existing (user_id, status, created_at) composite for filtered lists + stats.
CREATE INDEX IF NOT EXISTS "outreach_user_id_status_created_at_idx"
  ON "outreach" ("userId", "status", "created_at");

-- startup_employees: index the FK used by the `with: { employees: true }`
-- relation load on the startups page.
CREATE INDEX IF NOT EXISTS "startup_employees_startup_id_idx"
  ON "startup_employees" ("startup_id");
