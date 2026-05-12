-- Tighten overly broad sourcer/copywriter RLS policies.
-- The bootstrap migration granted sourcer+copywriter access to tables they don't need.

-- carts: only admin/manager need to browse client carts
DROP POLICY IF EXISTS "carts_select_admin_mod" ON public.carts;
CREATE POLICY "carts_select_admin_mod"
  ON public.carts FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- cart_items: same scope as carts
DROP POLICY IF EXISTS "cart_items_select_admin_mod" ON public.cart_items;
CREATE POLICY "cart_items_select_admin_mod"
  ON public.cart_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- orders SELECT: admin/manager see all; sourcer sees only orders on their sites
-- (load-earnings.ts queries orders joined to sites where sourcer_id = uid — this aligns exactly)
DROP POLICY IF EXISTS "orders_select_admin_mod" ON public.orders;
CREATE POLICY "orders_select_admin_mod"
  ON public.orders FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "orders_select_sourcer_own_sites" ON public.orders;
CREATE POLICY "orders_select_sourcer_own_sites"
  ON public.orders FOR SELECT
  USING (
    public.get_my_role() = 'sourcer'
    AND site_id IN (SELECT id FROM public.sites WHERE sourcer_id = auth.uid())
  );

-- orders UPDATE: only admin/manager (copywriter keeps existing orders_update_copywriter_own)
DROP POLICY IF EXISTS "orders_update_admin_mod" ON public.orders;
CREATE POLICY "orders_update_admin_mod"
  ON public.orders FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager'));

-- invoices SELECT: admin/manager; copywriter already has invoices_select_copywriter
DROP POLICY IF EXISTS "invoices_select_admin_mod" ON public.invoices;
CREATE POLICY "invoices_select_admin_mod"
  ON public.invoices FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- invoices UPDATE: only admin/manager should change invoice state
DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;
CREATE POLICY "invoices_update_staff"
  ON public.invoices FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager'));

-- change_requests SELECT: admin/manager; copywriter already has change_requests_select_copywriter
DROP POLICY IF EXISTS "change_requests_select_admin_mod" ON public.change_requests;
CREATE POLICY "change_requests_select_admin_mod"
  ON public.change_requests FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- change_requests UPDATE: only admin/manager
DROP POLICY IF EXISTS "change_requests_update_admin_mod" ON public.change_requests;
CREATE POLICY "change_requests_update_admin_mod"
  ON public.change_requests FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager'));

-- invoice_items SELECT: admin/manager + copywriter scoped to their assigned orders
DROP POLICY IF EXISTS "invoice_items_select_staff" ON public.invoice_items;
CREATE POLICY "invoice_items_select_staff"
  ON public.invoice_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "invoice_items_select_copywriter_own" ON public.invoice_items;
CREATE POLICY "invoice_items_select_copywriter_own"
  ON public.invoice_items FOR SELECT
  USING (
    public.get_my_role() = 'copywriter'
    AND order_id IN (SELECT id FROM public.orders WHERE copywriter_id = auth.uid())
  );

-- sites UPDATE: remove copywriter (sourcers still manage the catalog)
DROP POLICY IF EXISTS "sites_update_admin_mod" ON public.sites;
CREATE POLICY "sites_update_admin_mod"
  ON public.sites FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer'));
