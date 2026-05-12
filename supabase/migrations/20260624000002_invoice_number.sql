-- Add human-readable invoice number (e.g. INV-2026-0001).

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Backfill existing rows ordered by creation time so numbers are chronological.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, created_at FROM public.invoices
    WHERE invoice_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE public.invoices
    SET invoice_number = 'INV-' || TO_CHAR(r.created_at, 'YYYY') || '-' || LPAD(nextval('public.invoice_number_seq')::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Trigger function: assigns invoice_number before insert if not already set.
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON public.invoices;
CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.assign_invoice_number();

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
