-- Sliding-window rate limit for admin invite/resend server actions (service_role writes only).

CREATE TABLE IF NOT EXISTS public.admin_invite_rate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_invite_rate_events_actor_created_idx
  ON public.admin_invite_rate_events (actor_id, created_at DESC);

COMMENT ON TABLE public.admin_invite_rate_events IS
  'Append-only events for org-admin invite/resend rate limiting; queried and inserted via service role only.';

ALTER TABLE public.admin_invite_rate_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_invite_rate_events FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_invite_rate_events FROM authenticated;
REVOKE ALL ON TABLE public.admin_invite_rate_events FROM anon;
