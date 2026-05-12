-- Restrict client access to invoices: clients may only read sent/paid invoices.
-- Replaces the original invoices_select_own policy which allowed any status.

DROP POLICY IF EXISTS "invoices_select_own" ON public.invoices;
CREATE POLICY "invoices_select_own"
  ON public.invoices FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    AND status IN ('sent', 'paid')
  );

-- Clients can read invoice_items only for their sent/paid invoices.
DROP POLICY IF EXISTS "invoice_items_select_own" ON public.invoice_items;
CREATE POLICY "invoice_items_select_own"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
        AND status IN ('sent', 'paid')
    )
  );
