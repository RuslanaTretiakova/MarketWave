-- Align invoice lifecycle to draft -> sent -> paid and add invoice_items.

-- 1) Replace legacy invoice status enum values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'invoice_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.invoice_status_new AS ENUM ('draft', 'sent', 'paid');

    ALTER TABLE public.invoices
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE public.invoices
      ALTER COLUMN status TYPE public.invoice_status_new
      USING (
        CASE status::text
          WHEN 'pending' THEN 'draft'
          WHEN 'overdue' THEN 'sent'
          WHEN 'paid' THEN 'paid'
          WHEN 'canceled' THEN 'draft'
          ELSE 'draft'
        END
      )::public.invoice_status_new;

    DROP TYPE public.invoice_status;
    ALTER TYPE public.invoice_status_new RENAME TO invoice_status;

    ALTER TABLE public.invoices
      ALTER COLUMN status SET DEFAULT 'draft'::public.invoice_status;
  END IF;
END $$;

-- 2) Normalize sent timestamps for rows mapped from overdue.
UPDATE public.invoices
SET sent_at = COALESCE(sent_at, updated_at)
WHERE status = 'sent'::public.invoice_status;

-- 3) Add invoice items table and seed one item per invoice.
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  site_domain TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_order_id ON public.invoice_items (order_id);

DROP TRIGGER IF EXISTS set_updated_at_invoice_items ON public.invoice_items;
CREATE TRIGGER set_updated_at_invoice_items
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount)
SELECT i.id, i.order_id, COALESCE(o.site_domain, 'Unknown site'), i.amount
FROM public.invoices i
JOIN public.orders o ON o.id = i.order_id
LEFT JOIN public.invoice_items ii ON ii.invoice_id = i.id
WHERE ii.id IS NULL;

-- 4) Keep parent invoice amount in sync with its items.
CREATE OR REPLACE FUNCTION public.sync_invoice_total_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  UPDATE public.invoices
  SET amount = COALESCE(
      (
        SELECT ROUND(SUM(ii.amount)::numeric, 2)
        FROM public.invoice_items ii
        WHERE ii.invoice_id = v_invoice_id
      ),
      0
    ),
    updated_at = now()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_items_changed ON public.invoice_items;
CREATE TRIGGER on_invoice_items_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_total_from_items();

-- 5) Ensure new orders create both invoice and invoice item rows.
CREATE OR REPLACE FUNCTION public.handle_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  INSERT INTO public.invoices (order_id, amount, due_date, status)
  VALUES (
    NEW.id,
    NEW.price,
    (CURRENT_DATE + INTERVAL '30 days')::DATE,
    'draft'
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount)
  VALUES (v_invoice_id, NEW.id, COALESCE(NEW.site_domain, 'Unknown site'), NEW.price);

  RETURN NEW;
END;
$$;
