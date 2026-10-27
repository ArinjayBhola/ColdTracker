-- Additive, rerunnable migration. Tracking tables from 0012 must already exist.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  outreach_id uuid NOT NULL REFERENCES public.outreach(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject varchar(300) NOT NULL,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_owner_time_idx ON public.notifications(user_id, created_at, id);
CREATE INDEX IF NOT EXISTS notifications_owner_unread_idx ON public.notifications(user_id, created_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_outreach_idx ON public.notifications(outreach_id);

-- Definer functions let the restricted collector continue with its existing
-- grants. Fixed search_path and fully qualified relations prevent shadowing.
CREATE OR REPLACE FUNCTION public.notify_email_open() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  INSERT INTO public.notifications(id, user_id, outreach_id, recipient, subject, observed_at)
  SELECT NEW.id, m.user_id, m.outreach_id, m.recipient, m.subject, NEW.observed_at
  FROM public.outreach_email_messages m
  JOIN public.outreach o ON o.id = m.outreach_id AND o."userId" = m.user_id
  WHERE m.id = NEW.message_id AND m.delivery_state = 'accepted'
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_email_open() FROM PUBLIC;

-- Opens can arrive before provider acceptance or before the ERP links the
-- message to an outreach. Publish those events once both conditions are met.
CREATE OR REPLACE FUNCTION public.notify_linked_email_opens() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.delivery_state = 'accepted' AND NEW.outreach_id IS NOT NULL THEN
    INSERT INTO public.notifications(id, user_id, outreach_id, recipient, subject, observed_at)
    SELECT e.id, NEW.user_id, NEW.outreach_id, NEW.recipient, NEW.subject, e.observed_at
    FROM public.outreach_email_open_events e
    JOIN public.outreach o ON o.id = NEW.outreach_id AND o."userId" = NEW.user_id
    WHERE e.message_id = NEW.id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_linked_email_opens() FROM PUBLIC;

CREATE OR REPLACE TRIGGER email_open_notification
AFTER INSERT ON public.outreach_email_open_events
FOR EACH ROW EXECUTE FUNCTION public.notify_email_open();
CREATE OR REPLACE TRIGGER linked_email_open_notifications
AFTER UPDATE OF delivery_state, outreach_id ON public.outreach_email_messages
FOR EACH ROW
WHEN (OLD.delivery_state IS DISTINCT FROM NEW.delivery_state OR OLD.outreach_id IS DISTINCT FROM NEW.outreach_id)
EXECUTE FUNCTION public.notify_linked_email_opens();

-- Existing detections remain browseable but do not flood the unread badge.
INSERT INTO public.notifications(id, user_id, outreach_id, recipient, subject, observed_at, created_at, read_at)
SELECT e.id, m.user_id, m.outreach_id, m.recipient, m.subject, e.observed_at, e.observed_at, now()
FROM public.outreach_email_open_events e
JOIN public.outreach_email_messages m ON m.id = e.message_id
JOIN public.outreach o ON o.id = m.outreach_id AND o."userId" = m.user_id
WHERE m.delivery_state = 'accepted'
ON CONFLICT (id) DO NOTHING;
COMMIT;
