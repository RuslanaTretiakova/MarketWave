-- Allow clients to see their own draft invoices (not just sent/paid).
-- Admin/manager still see all invoices via adminClient (bypasses RLS).
-- Clients should be able to track upcoming bills before they are formally sent.

DROP POLICY IF EXISTS "invoices_select_client" ON public.invoices;
CREATE POLICY "invoices_select_client"
  ON public.invoices FOR SELECT
  USING (client_id = auth.uid());

-- Mirror the relaxed policy for invoice_items so the join succeeds for draft invoices.
DROP POLICY IF EXISTS "invoice_items_select_client" ON public.invoice_items;
CREATE POLICY "invoice_items_select_client"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE client_id = auth.uid()
    )
  );
