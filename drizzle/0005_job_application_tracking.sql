-- Add source and application tracking while preserving existing outreach data.
ALTER TABLE "outreach"
  ADD COLUMN IF NOT EXISTS "application_source" text NOT NULL DEFAULT 'DIRECT_EMAIL';

ALTER TABLE "outreach"
  ADD COLUMN IF NOT EXISTS "application_url" text;

ALTER TABLE "outreach"
  ADD COLUMN IF NOT EXISTS "application_status" text NOT NULL DEFAULT 'SENT';
