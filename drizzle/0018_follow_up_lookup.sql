-- Install using npm run db:migrate:follow-up-lookup. The runner installs this
-- transactionally, then backfills in short locked batches without editing outreach.
CREATE TABLE IF NOT EXISTS public.outreach_follow_up_lookup (
  outreach_id uuid NOT NULL REFERENCES public.outreach(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  contact_index integer NOT NULL CHECK (contact_index >= 0),
  contact_id text,
  stage integer NOT NULL CHECK (stage IN (1,2)),
  active boolean NOT NULL,
  pending boolean NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  PRIMARY KEY (outreach_id, contact_index)
);
CREATE INDEX IF NOT EXISTS outreach_follow_up_lookup_owner_due_idx
  ON public.outreach_follow_up_lookup (user_id, due_at, outreach_id, contact_id)
  WHERE active AND pending AND due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_follow_up_lookup_owner_stage_due_idx
  ON public.outreach_follow_up_lookup (user_id, stage, due_at, outreach_id, contact_id)
  WHERE active AND pending AND due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_follow_up_lookup_owner_completed_idx
  ON public.outreach_follow_up_lookup (user_id, completed_at DESC, outreach_id, contact_id)
  WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_follow_up_lookup_owner_stage_completed_idx
  ON public.outreach_follow_up_lookup (user_id, stage, completed_at DESC, outreach_id, contact_id)
  WHERE completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.coldtrack_follow_up_date(value text)
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = pg_catalog SET TimeZone = 'UTC' AS $$
  SELECT CASE WHEN value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}([Tt ]|$)'
    AND pg_input_is_valid(value, 'timestamp with time zone')
    THEN value::timestamptz END
$$;

CREATE OR REPLACE FUNCTION public.coldtrack_sync_follow_up_lookup(
  p_outreach_id uuid, p_user_id text, p_status text, p_contacts jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.outreach_follow_up_lookup AS current
    (outreach_id, user_id, contact_index, contact_id, stage, active, pending, due_at, completed_at)
  SELECT p_outreach_id, p_user_id, (c.ordinality - 1)::int, c.id,
    CASE WHEN nullif(c."followUpSentAt", '') IS NULL THEN 1 ELSE 2 END,
    p_status NOT IN ('DRAFT','REPLIED','INTERVIEW','REJECTED','OFFER','CLOSED'),
    nullif(c."followUp2SentAt", '') IS NULL,
    public.coldtrack_follow_up_date(CASE WHEN nullif(c."followUpSentAt", '') IS NULL
      THEN c."followUpDueAt" ELSE c."followUp2DueAt" END),
    public.coldtrack_follow_up_date(c."followUp2SentAt")
  FROM ROWS FROM (jsonb_to_recordset(p_contacts) AS
    (id text, "followUpSentAt" text, "followUpDueAt" text, "followUp2DueAt" text, "followUp2SentAt" text)) WITH ORDINALITY c
  ON CONFLICT (outreach_id, contact_index) DO UPDATE SET
    user_id = EXCLUDED.user_id, contact_id = EXCLUDED.contact_id, stage = EXCLUDED.stage,
    active = EXCLUDED.active, pending = EXCLUDED.pending, due_at = EXCLUDED.due_at, completed_at = EXCLUDED.completed_at
  WHERE (current.user_id, current.contact_id, current.stage, current.active, current.pending, current.due_at, current.completed_at)
    IS DISTINCT FROM (EXCLUDED.user_id, EXCLUDED.contact_id, EXCLUDED.stage, EXCLUDED.active, EXCLUDED.pending, EXCLUDED.due_at, EXCLUDED.completed_at);
  DELETE FROM public.outreach_follow_up_lookup
    WHERE outreach_id = p_outreach_id AND contact_index >= jsonb_array_length(p_contacts);
END;
$$;
-- Source writers need no new table grants; only the fixed-path trigger and the
-- migration owner can refresh derived rows. No source contact data is changed.
REVOKE ALL ON FUNCTION public.coldtrack_sync_follow_up_lookup(uuid,text,text,jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.coldtrack_refresh_follow_up_lookup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.contacts IS NOT DISTINCT FROM OLD.contacts
    AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW."userId" IS NOT DISTINCT FROM OLD."userId" THEN
    RETURN NEW;
  END IF;
  PERFORM public.coldtrack_sync_follow_up_lookup(NEW.id, NEW."userId", NEW.status::text, NEW.contacts);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.coldtrack_refresh_follow_up_lookup() FROM PUBLIC;
CREATE OR REPLACE TRIGGER coldtrack_follow_up_lookup AFTER INSERT OR UPDATE ON public.outreach
  FOR EACH ROW EXECUTE FUNCTION public.coldtrack_refresh_follow_up_lookup();
