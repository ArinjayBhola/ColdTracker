-- The migration runner supplies the transaction (including Drizzle's runner).
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS reminder_time varchar(5) NOT NULL DEFAULT '17:00';
ALTER TABLE public.outreach ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Baselines preserve only known state. They do not invent earlier replies or dates.
UPDATE public.outreach SET status_history = jsonb_build_array(jsonb_build_object(
  'status', status, 'at', to_jsonb(updated_at AT TIME ZONE 'UTC'), 'source', 'baseline'
)) WHERE status_history = '[]'::jsonb;

-- The old company-wide fields cannot identify a recipient. Preserve them on the
-- first contact only. The marker makes this migration safe to run repeatedly.
UPDATE public.outreach o SET contacts = (
  SELECT coalesce(jsonb_agg(
    c || jsonb_build_object('id', coalesce(nullif(c->>'id', ''), gen_random_uuid()::text)) ||
    CASE WHEN n = 1 AND NOT (c ? 'followUpSentAt') THEN jsonb_build_object(
      'followUpSentAt', o.follow_up_sent_at AT TIME ZONE 'UTC',
      'followUp2DueAt', o.follow_up_2_due_at AT TIME ZONE 'UTC',
      'followUp2SentAt', o.follow_up_2_sent_at AT TIME ZONE 'UTC'
    ) ELSE '{}'::jsonb END ORDER BY n), '[]'::jsonb)
  FROM jsonb_array_elements(o.contacts) WITH ORDINALITY AS e(c, n)
);

CREATE OR REPLACE FUNCTION public.coldtrack_record_outreach_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status_history = '[]'::jsonb THEN
      NEW.status_history := jsonb_build_array(jsonb_build_object('status', NEW.status,
        'at', to_jsonb(clock_timestamp()), 'source', 'observed'));
    END IF;
  ELSE
    -- Retain observed history even when an old client or backup writes this row.
    SELECT coalesce(jsonb_agg(event ORDER BY (event->>'at')::timestamptz, event->>'status'), '[]'::jsonb)
      INTO NEW.status_history FROM (
        SELECT DISTINCT event FROM jsonb_array_elements(OLD.status_history || NEW.status_history) event
      ) merged;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status_history := NEW.status_history || jsonb_build_array(jsonb_build_object(
        'status', NEW.status, 'at', to_jsonb(clock_timestamp()), 'source', 'observed'));
    END IF;
  END IF;
  -- Stable IDs also cover extension, import, and external automation writes.
  SELECT coalesce(jsonb_agg(c || jsonb_build_object('id', coalesce(nullif(c->>'id', ''), gen_random_uuid()::text)) ORDER BY n), '[]'::jsonb)
    INTO NEW.contacts FROM jsonb_array_elements(NEW.contacts) WITH ORDINALITY AS e(c, n);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS coldtrack_outreach_history ON public.outreach;
CREATE TRIGGER coldtrack_outreach_history BEFORE INSERT OR UPDATE ON public.outreach
  FOR EACH ROW EXECUTE FUNCTION public.coldtrack_record_outreach_history();

CREATE TABLE IF NOT EXISTS public.reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  day varchar(10) NOT NULL,
  kind text NOT NULL CHECK (kind IN ('daily', 'follow_up')),
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sending', 'sent', 'failed', 'expired')),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempted_at timestamptz,
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  CONSTRAINT reminder_deliveries_daily_kind_key UNIQUE (user_id, day, kind)
);
