-- Sliding-window rate limits for unauthenticated flows (password reset, client-error) and set-password attempts.
-- Inserts/selects via service_role only (same pattern as admin_invite_rate_events).

CREATE TABLE IF NOT EXISTS public.public_rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL
    CHECK (kind IN ('password_reset', 'client_error', 'set_password')),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_rate_limit_events_kind_key_created_idx
  ON public.public_rate_limit_events (kind, key, created_at DESC);

COMMENT ON TABLE public.public_rate_limit_events IS
  'Append-only rate-limit buckets; queried and inserted via service role only.';

ALTER TABLE public.public_rate_limit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_rate_limit_events FROM PUBLIC;
REVOKE ALL ON TABLE public.public_rate_limit_events FROM authenticated;
REVOKE ALL ON TABLE public.public_rate_limit_events FROM anon;
