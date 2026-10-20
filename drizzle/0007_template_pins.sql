ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "pinned" boolean DEFAULT false NOT NULL;
