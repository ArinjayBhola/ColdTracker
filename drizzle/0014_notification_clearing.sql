BEGIN;
SET LOCAL lock_timeout = '5s';
-- Keep the deduplication record so delayed linkage or a migration rerun cannot
-- bring a dismissed notification back. The underlying email activity is intact.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS cleared_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_owner_visible_idx
  ON public.notifications(user_id, created_at, id) WHERE cleared_at IS NULL;
COMMIT;
