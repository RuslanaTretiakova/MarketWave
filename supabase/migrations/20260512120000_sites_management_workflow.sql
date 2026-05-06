-- Site catalog workflow: statuses, audit fields, sourcer CRUD, junction writes via RPC,
-- RLS aligned with Sourcer / Manager / Admin / Client matrix.

-- ─── site_status enum (PG 11+ ADD VALUE is transaction-safe) ───────────────────
ALTER TYPE public.site_status ADD VALUE IF NOT EXISTS 'needs_changes';
ALTER TYPE public.site_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.site_status ADD VALUE IF NOT EXISTS 'archived';

-- Legacy inactive → archived (sell / visibility semantics)
UPDATE public.sites SET status = 'archived'::public.site_status WHERE status = 'inactive'::public.site_status;

-- ─── sites columns ─────────────────────────────────────────────────────────────
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS sourcer_notes TEXT;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS needs_changes_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS needs_changes_at TIMESTAMPTZ;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sites.sourcer_notes IS 'Internal notes visible to sourcer and admin.';
COMMENT ON COLUMN public.sites.needs_changes_by IS 'Admin who marked the site as needing changes.';
COMMENT ON COLUMN public.sites.needs_changes_at IS 'When the site entered needs_changes status.';
COMMENT ON COLUMN public.sites.approved_by IS 'Admin who approved the listing.';
COMMENT ON COLUMN public.sites.approved_at IS 'When the site entered approved status.';

-- ─── Triggers: sourcer insert defaults; sourcer edit → pending_review ───────────
CREATE OR REPLACE FUNCTION public.sites_enforce_sourcer_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND public.get_my_role() = 'sourcer' THEN
    NEW.sourcer_id := auth.uid();
    NEW.status := 'pending_review'::public.site_status;
  END IF;

  IF TG_OP = 'UPDATE'
     AND public.get_my_role() = 'sourcer'
     AND OLD.sourcer_id IS NOT DISTINCT FROM auth.uid() THEN
    NEW.status := 'pending_review'::public.site_status;
    NEW.needs_changes_by := NULL;
    NEW.needs_changes_at := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sites_enforce_sourcer_defaults ON public.sites;

CREATE TRIGGER sites_enforce_sourcer_defaults
  BEFORE INSERT OR UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.sites_enforce_sourcer_defaults();

-- ─── RPC: replace geo/language rows (SECURITY DEFINER; caller auth checked) ─────
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

REVOKE ALL ON FUNCTION public.replace_site_countries_and_languages(uuid, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_site_countries_and_languages(uuid, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_site_countries_and_languages(uuid, text[], text[]) TO service_role;

-- ─── sites RLS (replace broad staff policies) ───────────────────────────────────
DROP POLICY IF EXISTS "sites_select_client" ON public.sites;
DROP POLICY IF EXISTS "sites_select_admin_mod" ON public.sites;
DROP POLICY IF EXISTS "sites_insert_admin" ON public.sites;
DROP POLICY IF EXISTS "sites_update_admin_mod" ON public.sites;
DROP POLICY IF EXISTS "sites_delete_admin" ON public.sites;

CREATE POLICY "sites_select_client"
  ON public.sites FOR SELECT
  USING (status = 'active'::public.site_status AND public.get_my_role() = 'client');

CREATE POLICY "sites_select_admin"
  ON public.sites FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "sites_select_manager"
  ON public.sites FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND status IS DISTINCT FROM 'archived'::public.site_status
  );

CREATE POLICY "sites_select_sourcer_own"
  ON public.sites FOR SELECT
  USING (
    public.get_my_role() = 'sourcer'
    AND sourcer_id IS NOT DISTINCT FROM auth.uid()
    AND status IS DISTINCT FROM 'archived'::public.site_status
  );

CREATE POLICY "sites_insert_admin"
  ON public.sites FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "sites_insert_sourcer"
  ON public.sites FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'sourcer'
    AND sourcer_id IS NOT DISTINCT FROM auth.uid()
  );

CREATE POLICY "sites_update_admin"
  ON public.sites FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "sites_update_sourcer_own"
  ON public.sites FOR UPDATE
  USING (
    public.get_my_role() = 'sourcer'
    AND sourcer_id IS NOT DISTINCT FROM auth.uid()
    AND status IS DISTINCT FROM 'archived'::public.site_status
  );

CREATE POLICY "sites_delete_admin"
  ON public.sites FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ─── site_countries / site_languages: admin-only mutation (geo via RPC for sourcer)
DROP POLICY IF EXISTS "site_countries_write_admin" ON public.site_countries;

CREATE POLICY "site_countries_write_admin"
  ON public.site_countries FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "site_languages_write_admin" ON public.site_languages;

CREATE POLICY "site_languages_write_admin"
  ON public.site_languages FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
