-- REVIEW REQUIRED. Not applied automatically; do not drizzle push production.
BEGIN;
CREATE TABLE public.outreach_email_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 outreach_id uuid REFERENCES public.outreach(id) ON DELETE CASCADE,
 attempt_id text NOT NULL CHECK (attempt_id ~ '^[0-9a-f]{32}$'),
 sender_hash text NOT NULL CHECK (sender_hash ~ '^[0-9a-f]{64}$'),
 recipient text NOT NULL,
 subject varchar(300) NOT NULL,
 kind text NOT NULL CHECK (kind IN ('initial','follow_up_1','follow_up_2')),
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
 delivery_state text NOT NULL DEFAULT 'prepared' CHECK (delivery_state IN ('prepared','accepted','failed','ambiguous')),
 tracking_enabled boolean NOT NULL DEFAULT true,
 provider_id text,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 first_open_at timestamptz,
 last_open_at timestamptz,
 open_count integer NOT NULL DEFAULT 0 CHECK (open_count BETWEEN 0 AND 10000),
 window_start timestamptz,
 window_count integer NOT NULL DEFAULT 0 CHECK (window_count BETWEEN 0 AND 60),
 UNIQUE(user_id,attempt_id),
 CHECK (delivery_state <> 'accepted' OR (provider_id IS NOT NULL AND sent_at IS NOT NULL))
);
CREATE INDEX outreach_email_messages_owner_outreach_idx ON public.outreach_email_messages(user_id,outreach_id,sent_at);
CREATE TABLE public.outreach_email_open_events (
 id uuid PRIMARY KEY,
 message_id uuid NOT NULL REFERENCES public.outreach_email_messages(id) ON DELETE CASCADE,
 observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_email_open_events_message_time_idx ON public.outreach_email_open_events(message_id,observed_at);
COMMIT;
-- Collector least-privilege role: SELECT/UPDATE messages, SELECT/INSERT events.
-- Worker: SELECT/INSERT/UPDATE messages plus existing ERP logging grants.
-- Private UI query: SELECT messages/events plus existing owned-outreach access.
