-- Site status history: full audit trail of every status transition.
-- Actor is auth.uid() — will be NULL for service-role (adminClient) mutations;
-- those show as system/admin actions in the UI.

CREATE TABLE IF NOT EXISTS public.site_status_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  from_status    public.site_status NOT NULL,
  to_status      public.site_status NOT NULL,
  actor_user_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_status_history_site_created
  ON public.site_status_history (site_id, created_at DESC);

ALTER TABLE public.site_status_history ENABLE ROW LEVEL SECURITY;

-- Admin and manager: see history for any site
-- Sourcer: see history only for their own sites
CREATE POLICY "site_status_history_select"
  ON public.site_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.sites
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE sites.id = site_status_history.site_id
        AND profiles.role IN ('admin', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = site_status_history.site_id
        AND sites.sourcer_id = auth.uid()
    )
  );

-- Direct INSERT via service role only (trigger uses SECURITY DEFINER, bypasses RLS)
CREATE POLICY "site_status_history_insert_service"
  ON public.site_status_history FOR INSERT
  WITH CHECK (false);

-- Trigger function: auto-log every status transition
CREATE OR REPLACE FUNCTION public.audit_site_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.site_status_history
      (site_id, from_status, to_status, actor_user_id, comment)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE
        WHEN NEW.status = 'needs_changes' THEN NEW.needs_changes_comment
        ELSE NULL
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_site_status_change
  AFTER UPDATE OF status ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_site_status_change();
