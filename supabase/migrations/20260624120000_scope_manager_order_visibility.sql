-- Scope manager RLS: managers should only see rows tied to their assigned clients.
-- Splits every broad `get_my_role() IN ('admin', 'manager')` policy into:
--   *_admin  — admin sees everything
--   *_manager_assigned — manager sees only rows where the owning client has
--                        account_manager_id = auth.uid()

-- ── orders SELECT ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_select_admin_mod" ON public.orders;

CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "orders_select_manager_assigned"
  ON public.orders FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND user_id IN (
      SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
    )
  );

-- ── orders UPDATE ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_update_admin_mod" ON public.orders;

CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "orders_update_manager_assigned"
  ON public.orders FOR UPDATE
  USING (
    public.get_my_role() = 'manager'
    AND user_id IN (
      SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
    )
  );

-- ── invoices SELECT ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_select_admin_mod" ON public.invoices;

CREATE POLICY "invoices_select_admin"
  ON public.invoices FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "invoices_select_manager_assigned"
  ON public.invoices FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
      )
    )
  );

-- ── invoices UPDATE ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;

CREATE POLICY "invoices_update_admin"
  ON public.invoices FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "invoices_update_manager_assigned"
  ON public.invoices FOR UPDATE
  USING (
    public.get_my_role() = 'manager'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
      )
    )
  );

-- ── change_requests SELECT ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "change_requests_select_admin_mod" ON public.change_requests;

CREATE POLICY "change_requests_select_admin"
  ON public.change_requests FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "change_requests_select_manager_assigned"
  ON public.change_requests FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
      )
    )
  );

-- ── change_requests UPDATE ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "change_requests_update_admin_mod" ON public.change_requests;

CREATE POLICY "change_requests_update_admin"
  ON public.change_requests FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "change_requests_update_manager_assigned"
  ON public.change_requests FOR UPDATE
  USING (
    public.get_my_role() = 'manager'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
      )
    )
  );

-- ── invoice_items SELECT ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoice_items_select_staff" ON public.invoice_items;

CREATE POLICY "invoice_items_select_admin"
  ON public.invoice_items FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "invoice_items_select_manager_assigned"
  ON public.invoice_items FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
      )
    )
  );
