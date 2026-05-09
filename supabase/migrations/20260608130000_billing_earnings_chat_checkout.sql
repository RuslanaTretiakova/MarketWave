-- Fill implementation gaps:
-- - Allow invoice-paid completion transition.
-- - Add monthly invoice modeling fields.
-- - Add sourcer earnings tracking.
-- - Capture order details at cart stage.
-- - Add first-class chat channels.

-- 1) Fix status transition so invoice trigger can complete published orders.
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_next TEXT[];
  actor_role public.user_role;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  actor_role := public.get_my_role();
  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status
    WHEN 'new'              THEN ARRAY['in_progress', 'canceled']
    WHEN 'in_progress'      THEN ARRAY['content_sent']
    WHEN 'content_sent'     THEN ARRAY['content_approved', 'needs_changes']
    WHEN 'needs_changes'    THEN ARRAY['in_progress', 'content_sent']
    WHEN 'content_approved' THEN ARRAY['published']
    WHEN 'published'        THEN ARRAY['completed']
    WHEN 'completed'        THEN ARRAY[]::TEXT[]
    WHEN 'canceled'         THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Checkout payload captured in cart and copied to orders.
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS anchor_text TEXT,
  ADD COLUMN IF NOT EXISTS target_url TEXT,
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS publish_month DATE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS publish_month DATE;

COMMENT ON COLUMN public.cart_items.publish_month IS
  'Client-selected publication month represented as first day of month (YYYY-MM-01).';
COMMENT ON COLUMN public.orders.publish_month IS
  'Requested publication month represented as first day of month (YYYY-MM-01).';

-- 3) Monthly invoicing support (while keeping current per-order flow compatible).
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_order_id_key;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_month DATE,
  ADD COLUMN IF NOT EXISTS invoice_group_id UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON public.invoices (billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_group_id ON public.invoices (invoice_group_id);

-- 4) Sourcer earnings ledger.
CREATE TABLE IF NOT EXISTS public.sourcer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  earned_amount NUMERIC(10, 2) NOT NULL CHECK (earned_amount >= 0),
  commission_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1000 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  earning_month DATE NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payout_status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  payout_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sourcer_earnings_sourcer_month
  ON public.sourcer_earnings (sourcer_id, earning_month DESC);
CREATE INDEX IF NOT EXISTS idx_sourcer_earnings_payout_status
  ON public.sourcer_earnings (payout_status);

DROP TRIGGER IF EXISTS set_updated_at_sourcer_earnings ON public.sourcer_earnings;
CREATE TRIGGER set_updated_at_sourcer_earnings
  BEFORE UPDATE ON public.sourcer_earnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sourcer_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sourcer_earnings_select_own_or_staff" ON public.sourcer_earnings;
CREATE POLICY "sourcer_earnings_select_own_or_staff" ON public.sourcer_earnings
  FOR SELECT
  USING (
    sourcer_id = auth.uid()
    OR public.get_my_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "sourcer_earnings_manage_staff_only" ON public.sourcer_earnings;
CREATE POLICY "sourcer_earnings_manage_staff_only" ON public.sourcer_earnings
  FOR ALL
  USING (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

CREATE OR REPLACE FUNCTION public.refresh_sourcer_earning_for_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_invoice_id UUID;
  v_commission_rate NUMERIC(5, 4) := 0.1000;
BEGIN
  SELECT o.id, o.site_id, o.price, o.status, o.updated_at, s.sourcer_id
  INTO v_order
  FROM public.orders o
  LEFT JOIN public.sites s ON s.id = o.site_id
  WHERE o.id = p_order_id;

  IF v_order.id IS NULL OR v_order.sourcer_id IS NULL THEN
    DELETE FROM public.sourcer_earnings WHERE order_id = p_order_id;
    RETURN;
  END IF;

  IF v_order.status <> 'published' AND v_order.status <> 'completed' THEN
    DELETE FROM public.sourcer_earnings WHERE order_id = p_order_id;
    RETURN;
  END IF;

  SELECT i.id
  INTO v_invoice_id
  FROM public.invoices i
  WHERE i.order_id = p_order_id
  ORDER BY i.created_at DESC
  LIMIT 1;

  INSERT INTO public.sourcer_earnings (
    sourcer_id,
    order_id,
    site_id,
    invoice_id,
    earned_amount,
    commission_rate,
    earning_month
  )
  VALUES (
    v_order.sourcer_id,
    v_order.id,
    v_order.site_id,
    v_invoice_id,
    ROUND((v_order.price * v_commission_rate)::numeric, 2),
    v_commission_rate,
    date_trunc('month', v_order.updated_at)::date
  )
  ON CONFLICT (order_id)
  DO UPDATE SET
    sourcer_id = EXCLUDED.sourcer_id,
    site_id = EXCLUDED.site_id,
    invoice_id = EXCLUDED.invoice_id,
    earned_amount = EXCLUDED.earned_amount,
    commission_rate = EXCLUDED.commission_rate,
    earning_month = EXCLUDED.earning_month,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_earning_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_sourcer_earning_for_order(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_earning_refresh ON public.orders;
CREATE TRIGGER on_order_earning_refresh
  AFTER INSERT OR UPDATE OF status, site_id, price ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_earning_refresh();

-- 5) First-class chat channel type.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_channel_type') THEN
    CREATE TYPE public.chat_channel_type AS ENUM ('standard', 'support', 'sales');
  END IF;
END $$;

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS channel public.chat_channel_type NOT NULL DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_chat_rooms_channel ON public.chat_rooms (channel);

UPDATE public.chat_rooms
SET channel = CASE
  WHEN kind = 'order' OR order_id IS NOT NULL THEN 'standard'::public.chat_channel_type
  WHEN position('support' in lower(coalesce(title, ''))) > 0 THEN 'support'::public.chat_channel_type
  ELSE 'sales'::public.chat_channel_type
END
WHERE channel IS NOT NULL;
