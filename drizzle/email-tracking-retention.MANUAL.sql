-- Optional owner-reviewed maintenance. Not run by the application or migration.
BEGIN;
DELETE FROM public.outreach_email_open_events WHERE observed_at < now() - interval '90 days';
UPDATE public.outreach_email_messages SET tracking_enabled=false WHERE created_at < now() - interval '90 days';
DELETE FROM public.outreach_email_messages WHERE outreach_id IS NULL AND created_at < now() - interval '90 days';
COMMIT;
