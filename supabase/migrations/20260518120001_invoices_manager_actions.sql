-- Invoice workspace for managers: track when an invoice was emailed to the client,
-- and confirm that managers can mutate invoices. RLS already permits manager UPDATE
-- via the `invoices_update_staff` policy from 20260501120001; this migration covers
-- the audit/notification field and reaffirms the policy with a clarified comment.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.invoices.sent_at IS
  'When the invoice was last emailed to the client; null means never sent.';

-- Re-create the staff UPDATE policy idempotently so manager edits via createClient()
-- continue to work even when policies are squashed in future migrations.
DROP POLICY IF EXISTS "invoices_update_staff" ON public.invoices;
CREATE POLICY "invoices_update_staff"
  ON public.invoices FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));
