-- Remove copywriter from broad staff policies so they only see/update
-- orders assigned to them (via the existing orders_select_copywriter_own policy).

DROP POLICY IF EXISTS "orders_select_admin_mod" ON public.orders;
CREATE POLICY "orders_select_admin_mod"
  ON public.orders FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer'));

DROP POLICY IF EXISTS "orders_update_admin_mod" ON public.orders;
CREATE POLICY "orders_update_admin_mod"
  ON public.orders FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer'));

-- Copywriters can update only orders assigned to them
CREATE POLICY "orders_update_copywriter_own"
  ON public.orders FOR UPDATE
  USING (copywriter_id = auth.uid() AND public.get_my_role() = 'copywriter');
