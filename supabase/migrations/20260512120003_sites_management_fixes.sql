-- Fix Site Management module issues: status transitions, admin creation, RPC validation.

-- This migration was moved to a post-site-status-enum version so it can safely
-- reference the newly added status values and policies.

-- ─── Add status transition enforcement trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_site_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status::TEXT
    WHEN 'pending_review' THEN ARRAY['needs_changes', 'approved', 'archived']
    WHEN 'needs_changes'  THEN ARRAY['approved', 'archived']
    WHEN 'approved'       THEN ARRAY['active', 'archived']
    WHEN 'active'         THEN ARRAY['needs_changes', 'archived']
    WHEN 'archived'       THEN ARRAY['active']
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid site status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_site_status_transitions
  BEFORE UPDATE OF status ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.enforce_site_status_transition();

-- ─── Allow admin to create sites (for data import) ─────────────────────────────
DROP POLICY IF EXISTS "sites_insert_admin" ON public.sites;
CREATE POLICY "sites_insert_admin"
  ON public.sites FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- ─── Fix RPC: validate site existence before operations ──────────────────────
CREATE OR REPLACE FUNCTION public.replace_site_countries_and_languages(
  p_site_id uuid,
  p_countries text[],
  p_languages text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO r FROM public.profiles WHERE id = auth.uid();
  IF r IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Validate site exists
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = p_site_id) THEN
    RAISE EXCEPTION 'Site not found' USING ERRCODE = 'P0002';
  END IF;

  IF r = 'admin' THEN
    NULL;
  ELSIF r = 'sourcer' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.sites s
      WHERE s.id = p_site_id
        AND s.sourcer_id IS NOT DISTINCT FROM auth.uid()
        AND s.status IS DISTINCT FROM 'archived'::public.site_status
    ) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.site_countries WHERE site_id = p_site_id;
  DELETE FROM public.site_languages WHERE site_id = p_site_id;

  INSERT INTO public.site_countries (site_id, country)
  SELECT DISTINCT p_site_id, c
  FROM unnest(COALESCE(p_countries, '{}'::text[])) AS u(c);

  INSERT INTO public.site_languages (site_id, language)
  SELECT DISTINCT p_site_id, l
  FROM unnest(COALESCE(p_languages, '{}'::text[])) AS u(l);
END;
$$;
