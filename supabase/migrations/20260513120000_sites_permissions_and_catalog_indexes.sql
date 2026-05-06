-- Align site permissions matrix and add targeted catalog indexes.

-- Manager can view all sites (including archived).
DROP POLICY IF EXISTS "sites_select_manager" ON public.sites;
CREATE POLICY "sites_select_manager"
  ON public.sites FOR SELECT
  USING (public.get_my_role() = 'manager');

-- Only sourcers can create sites.
DROP POLICY IF EXISTS "sites_insert_admin" ON public.sites;

-- Targeted indexes for role-scoped browsing and sorting in the sites catalog.
CREATE INDEX IF NOT EXISTS idx_sites_status_domain
  ON public.sites (status, domain);

CREATE INDEX IF NOT EXISTS idx_sites_sourcer_status_domain
  ON public.sites (sourcer_id, status, domain);
