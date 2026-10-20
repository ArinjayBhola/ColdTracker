CREATE TABLE IF NOT EXISTS "message_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "subject" varchar(500) DEFAULT '' NOT NULL,
  "body" text NOT NULL,
  "category" varchar(80) DEFAULT '' NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "character_limit" integer,
  "favorite" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "message_templates_character_limit_check" CHECK ("character_limit" IS NULL OR "character_limit" BETWEEN 1 AND 50000)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_templates_user_id_idx" ON "message_templates" ("user_id");
