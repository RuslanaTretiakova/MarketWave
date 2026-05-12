-- Enable RLS on invoice_items (was missing) and mirror the parent invoices policies.
-- Without this, any authenticated user can query all invoice items via the REST API.

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Staff can read all invoice items (mirrors invoices_select_admin_mod on invoices table)
CREATE POLICY "invoice_items_select_staff"
  ON public.invoice_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager', 'sourcer', 'copywriter'));

-- Admin and manager can update item amounts (mirrors invoices_update_staff on invoices table)
CREATE POLICY "invoice_items_update_staff"
  ON public.invoice_items FOR UPDATE
  USING  (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));
