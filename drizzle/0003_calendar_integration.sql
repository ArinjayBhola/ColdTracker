ALTER TABLE "user" ADD COLUMN "calendar_sync_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "calendar_synced" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "calendar_event_id" text;--> statement-breakpoint
ALTER TABLE "outreach" ADD COLUMN "calendar_event_id_2" text;
