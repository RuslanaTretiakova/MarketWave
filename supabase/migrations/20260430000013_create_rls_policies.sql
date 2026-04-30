-- ─── profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin_mod"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- Clients can update their own non-role fields; role field is locked
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ─── categories ────────────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_authenticated"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "categories_write_admin"
  ON public.categories FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ─── sites ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select_client"
  ON public.sites FOR SELECT
  USING (status = 'active' AND public.get_my_role() = 'client');

CREATE POLICY "sites_select_admin_mod"
  ON public.sites FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

CREATE POLICY "sites_insert_admin"
  ON public.sites FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "sites_update_admin_mod"
  ON public.sites FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'moderator'));

CREATE POLICY "sites_delete_admin"
  ON public.sites FOR DELETE
  USING (public.get_my_role() = 'admin');

-- ─── site_countries ────────────────────────────────────────────────────────────
ALTER TABLE public.site_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_countries_select_authenticated"
  ON public.site_countries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "site_countries_write_admin"
  ON public.site_countries FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ─── site_languages ────────────────────────────────────────────────────────────
ALTER TABLE public.site_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_languages_select_authenticated"
  ON public.site_languages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "site_languages_write_admin"
  ON public.site_languages FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ─── carts ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_select_own"
  ON public.carts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "carts_select_admin_mod"
  ON public.carts FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- ─── cart_items ────────────────────────────────────────────────────────────────
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_select_own"
  ON public.cart_items FOR SELECT
  USING (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_select_admin_mod"
  ON public.cart_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

CREATE POLICY "cart_items_insert_own"
  ON public.cart_items FOR INSERT
  WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_update_own"
  ON public.cart_items FOR UPDATE
  USING (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_delete_own"
  ON public.cart_items FOR DELETE
  USING (cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid()));

-- ─── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders_select_admin_mod"
  ON public.orders FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- Client can cancel their own 'new' orders
CREATE POLICY "orders_update_cancel_own"
  ON public.orders FOR UPDATE
  USING (user_id = auth.uid() AND status = 'new')
  WITH CHECK (user_id = auth.uid() AND status IN ('new', 'canceled'));

-- Client can approve/reject their own 'content_sent' orders
CREATE POLICY "orders_update_review_own"
  ON public.orders FOR UPDATE
  USING (user_id = auth.uid() AND status = 'content_sent')
  WITH CHECK (user_id = auth.uid() AND status IN ('content_approved', 'needs_changes'));

-- Admin/moderator can update any order
CREATE POLICY "orders_update_admin_mod"
  ON public.orders FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- ─── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "invoices_select_admin_mod"
  ON public.invoices FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

CREATE POLICY "invoices_write_admin"
  ON public.invoices FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "invoices_update_moderator"
  ON public.invoices FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- ─── change_requests ───────────────────────────────────────────────────────────
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_requests_select_own"
  ON public.change_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "change_requests_select_admin_mod"
  ON public.change_requests FOR SELECT
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- Client can open a change request only when order is content_sent
CREATE POLICY "change_requests_insert_own"
  ON public.change_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND order_id IN (
      SELECT id FROM public.orders
      WHERE user_id = auth.uid() AND status = 'content_sent'
    )
  );

CREATE POLICY "change_requests_update_admin_mod"
  ON public.change_requests FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'moderator'));

-- ─── error_logs ────────────────────────────────────────────────────────────────
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_select_admin"
  ON public.error_logs FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "error_logs_insert_authenticated"
  ON public.error_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
