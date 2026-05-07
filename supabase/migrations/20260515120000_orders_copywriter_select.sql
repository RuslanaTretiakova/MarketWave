-- Copywriters can SELECT orders assigned to them
CREATE POLICY "orders_select_copywriter_own"
  ON public.orders FOR SELECT
  USING (copywriter_id = auth.uid() AND public.get_my_role() = 'copywriter');

-- Copywriters can SELECT change_requests for their orders
CREATE POLICY "change_requests_select_copywriter"
  ON public.change_requests FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE copywriter_id = auth.uid())
    AND public.get_my_role() = 'copywriter'
  );

-- Copywriters can SELECT invoices for their orders
CREATE POLICY "invoices_select_copywriter"
  ON public.invoices FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE copywriter_id = auth.uid())
    AND public.get_my_role() = 'copywriter'
  );
