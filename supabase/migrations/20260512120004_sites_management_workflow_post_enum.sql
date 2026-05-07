-- Site catalog workflow RLS policy updates that depend on the new site_status value.
-- This migration is intentionally separate from the enum addition to avoid unsafe
-- use of a new enum value within the same transaction.

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
