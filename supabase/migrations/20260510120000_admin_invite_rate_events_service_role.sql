-- admin_invite_rate_events had RLS enabled with no policies and no GRANT to service_role.
-- PostgREST (used by the JS service_role client) could not SELECT/INSERT → invite flow failed.

GRANT SELECT, INSERT ON TABLE public.admin_invite_rate_events TO service_role;

DROP POLICY IF EXISTS "admin_invite_rate_events_service_role_all"
  ON public.admin_invite_rate_events;

CREATE POLICY "admin_invite_rate_events_service_role_all"
  ON public.admin_invite_rate_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
