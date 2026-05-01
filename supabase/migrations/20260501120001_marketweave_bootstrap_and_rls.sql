-- MarketWeave: first-user admin, bootstrap RPC, staff RLS (runs after enum values exist)

-- ─── First user → admin; invites use raw_user_meta_data.role ───────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming text := NEW.raw_user_meta_data ->> 'role';
  resolved public.user_role;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    resolved := 'admin';
  ELSIF incoming IN ('admin', 'client', 'sourcer', 'manager', 'copywriter') THEN
    resolved := incoming::public.user_role;
  ELSE
    resolved := 'client';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    resolved
  );
  RETURN NEW;
END;
$$;

-- ─── Bootstrap: empty profiles → allow /auth/sign-up UI ───────────────────────
CREATE OR REPLACE FUNCTION public.bootstrap_signup_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT COUNT(*)::bigint FROM public.profiles) = 0;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_signup_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_signup_allowed() TO anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_signup_allowed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_signup_allowed() TO service_role;

-- ─── RLS: staff visibility (non-client internal roles) ─────────────────────────
DROP POLICY IF EXISTS "profiles_select_admin_mod" ON public.profiles;
CREATE POLICY "profiles_select_admin_mod"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "sites_select_admin_mod" ON public.sites;
CREATE POLICY "sites_select_admin_mod"
  ON public.sites FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "sites_update_admin_mod" ON public.sites;
CREATE POLICY "sites_update_admin_mod"
  ON public.sites FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "carts_select_admin_mod" ON public.carts;
CREATE POLICY "carts_select_admin_mod"
  ON public.carts FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "cart_items_select_admin_mod" ON public.cart_items;
CREATE POLICY "cart_items_select_admin_mod"
  ON public.cart_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "orders_select_admin_mod" ON public.orders;
CREATE POLICY "orders_select_admin_mod"
  ON public.orders FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "orders_update_admin_mod" ON public.orders;
CREATE POLICY "orders_update_admin_mod"
  ON public.orders FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "invoices_select_admin_mod" ON public.invoices;
CREATE POLICY "invoices_select_admin_mod"
  ON public.invoices FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;
CREATE POLICY "invoices_update_staff"
  ON public.invoices FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "change_requests_select_admin_mod" ON public.change_requests;
CREATE POLICY "change_requests_select_admin_mod"
  ON public.change_requests FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

DROP POLICY IF EXISTS "change_requests_update_admin_mod" ON public.change_requests;
CREATE POLICY "change_requests_update_admin_mod"
  ON public.change_requests FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));
