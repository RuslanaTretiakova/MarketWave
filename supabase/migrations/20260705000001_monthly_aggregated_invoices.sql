-- Replace per-order invoice model with monthly aggregated invoices.
-- One invoice per (client, billing_month) containing many published orders.
-- All changes are ALTERs on top of existing tables.

-- ============================================================
-- 1. Drop old per-order auto-invoice triggers / functions
-- ============================================================

DROP TRIGGER IF EXISTS on_order_created ON public.orders;
DROP FUNCTION IF EXISTS public.handle_new_order();

DROP TRIGGER IF EXISTS on_order_price_sync_invoice ON public.orders;
DROP FUNCTION IF EXISTS public.sync_draft_invoice_item_from_order_price();

-- ============================================================
-- 2. ALTER invoices — new columns
-- ============================================================

ALTER TABLE public.invoices
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id    UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS subtotal     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustments  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total        NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_no_negative_total CHECK (subtotal + adjustments >= 0);

-- ============================================================
-- 3. ALTER invoice_items — description, nullable site_domain, unique order_id
-- ============================================================

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.invoice_items
  ALTER COLUMN site_domain DROP NOT NULL;

-- One order can appear at most once across ALL invoices (enforced after backfill).

-- ============================================================
-- 4. Backfill client_id and billing_month from the joined order
--    (must happen before NOT NULL constraints are added)
-- ============================================================

UPDATE public.invoices i
SET
  client_id    = o.user_id,
  billing_month = COALESCE(
    i.billing_month,
    date_trunc('month', COALESCE(o.publish_date, i.created_at::date))::date
  ),
  subtotal     = i.amount,
  total        = i.amount
FROM public.orders o
WHERE i.order_id = o.id
  AND i.client_id IS NULL;

-- Invoices with no order (edge case): set a safe default.
UPDATE public.invoices
SET
  billing_month = COALESCE(billing_month, date_trunc('month', created_at)::date),
  subtotal      = amount,
  total         = amount
WHERE client_id IS NULL;

-- ============================================================
-- 5. Consolidate: merge invoices that share (client_id, billing_month)
--    Survivor priority: paid > sent > draft; within same status, oldest first.
-- ============================================================

DO $$
DECLARE
  r        RECORD;
  survivor UUID;
  dead     UUID[];
BEGIN
  FOR r IN
    SELECT client_id, billing_month
    FROM public.invoices
    WHERE client_id IS NOT NULL
    GROUP BY client_id, billing_month
    HAVING COUNT(*) > 1
  LOOP
    -- Pick survivor: best status, then oldest
    SELECT id INTO survivor
    FROM public.invoices
    WHERE client_id    = r.client_id
      AND billing_month = r.billing_month
    ORDER BY
      CASE status WHEN 'paid' THEN 0 WHEN 'sent' THEN 1 ELSE 2 END,
      created_at ASC
    LIMIT 1;

    -- Collect non-survivors
    SELECT ARRAY_AGG(id) INTO dead
    FROM public.invoices
    WHERE client_id    = r.client_id
      AND billing_month = r.billing_month
      AND id <> survivor;

    IF dead IS NULL OR array_length(dead, 1) = 0 THEN
      CONTINUE;
    END IF;

    -- Re-parent invoice_items from dead invoices to the survivor
    -- (if order_id would collide, keep the survivor's item — skip duplicate)
    UPDATE public.invoice_items ii
    SET invoice_id = survivor
    WHERE ii.invoice_id = ANY(dead)
      AND NOT EXISTS (
        SELECT 1 FROM public.invoice_items x
        WHERE x.invoice_id = survivor AND x.order_id = ii.order_id
      );

    -- Delete any remaining items on dead invoices (order_id already on survivor)
    DELETE FROM public.invoice_items
    WHERE invoice_id = ANY(dead);

    -- Delete the dead invoice rows
    DELETE FROM public.invoices WHERE id = ANY(dead);

    -- Recompute totals on survivor from its items
    UPDATE public.invoices
    SET
      subtotal = COALESCE(
        (SELECT ROUND(SUM(amount)::numeric, 2) FROM public.invoice_items WHERE invoice_id = survivor),
        0
      ),
      amount   = COALESCE(
        (SELECT ROUND(SUM(amount)::numeric, 2) FROM public.invoice_items WHERE invoice_id = survivor),
        0
      )
    WHERE id = survivor;

    UPDATE public.invoices
    SET total = subtotal + adjustments
    WHERE id = survivor;
  END LOOP;
END;
$$;

-- ============================================================
-- 6. Enforce NOT NULL now that all rows are backfilled
-- ============================================================

ALTER TABLE public.invoices
  ALTER COLUMN client_id    SET NOT NULL,
  ALTER COLUMN billing_month SET NOT NULL;

-- ============================================================
-- 7. Add UNIQUE constraint on invoice_items.order_id
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_items_order_id
  ON public.invoice_items (order_id);

-- ============================================================
-- 8. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_client_id
  ON public.invoices (client_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_billing_month
  ON public.invoices (client_id, billing_month);

CREATE INDEX IF NOT EXISTS idx_invoices_status_billing_month
  ON public.invoices (status, billing_month);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_publish
  ON public.orders (user_id, status, publish_date);

-- ============================================================
-- 9. Rewrite sync trigger: subtotal, total, and legacy amount
-- ============================================================

DROP TRIGGER IF EXISTS on_invoice_items_changed ON public.invoice_items;
DROP FUNCTION IF EXISTS public.sync_invoice_total_from_items();

CREATE OR REPLACE FUNCTION public.sync_invoice_totals_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal   NUMERIC(10,2);
  v_adj        NUMERIC(10,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(ROUND(SUM(amount)::numeric, 2), 0)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  SELECT adjustments INTO v_adj
  FROM public.invoices
  WHERE id = v_invoice_id;

  UPDATE public.invoices
  SET
    subtotal   = v_subtotal,
    total      = v_subtotal + COALESCE(v_adj, 0),
    amount     = v_subtotal + COALESCE(v_adj, 0),
    updated_at = now()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_invoice_items_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_totals_from_items();

-- Also recompute when adjustments change on the invoice itself.
CREATE OR REPLACE FUNCTION public.sync_invoice_total_on_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.adjustments IS DISTINCT FROM OLD.adjustments THEN
    NEW.total  := NEW.subtotal + NEW.adjustments;
    NEW.amount := NEW.total;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_adjustment_changed ON public.invoices;
CREATE TRIGGER on_invoice_adjustment_changed
  BEFORE UPDATE OF adjustments ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_total_on_adjustment();

-- ============================================================
-- 10. Mutability guard: block edits on sent/paid invoices
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_invoice_mutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status     public.invoice_status;
  v_invoice_id UUID;
BEGIN
  -- Determine which invoice this operation touches
  IF TG_TABLE_NAME = 'invoice_items' THEN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  ELSE
    v_invoice_id := COALESCE(NEW.id, OLD.id);
  END IF;

  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;

  IF v_status = 'paid' THEN
    RAISE EXCEPTION 'Invoice is paid and fully immutable.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'sent' THEN
    IF TG_TABLE_NAME = 'invoice_items' THEN
      RAISE EXCEPTION 'Cannot modify items of a sent invoice.'
        USING ERRCODE = 'P0001';
    END IF;
    -- On the invoice row itself: only status transition to paid is allowed
    IF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM 'paid' AND (
        NEW.adjustments IS DISTINCT FROM OLD.adjustments OR
        NEW.subtotal    IS DISTINCT FROM OLD.subtotal    OR
        NEW.total       IS DISTINCT FROM OLD.total       OR
        NEW.due_date    IS DISTINCT FROM OLD.due_date    OR
        NEW.billing_month IS DISTINCT FROM OLD.billing_month OR
        NEW.notes       IS DISTINCT FROM OLD.notes
      ) THEN
        RAISE EXCEPTION 'Sent invoices are immutable except for status transition to paid.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
    IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'invoices' THEN
      RAISE EXCEPTION 'Cannot delete a sent invoice.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Validate order attachment on INSERT into invoice_items
  IF TG_TABLE_NAME = 'invoice_items' AND TG_OP = 'INSERT' THEN
    DECLARE
      v_order_user   UUID;
      v_order_status public.order_status;
      v_client_id    UUID;
    BEGIN
      SELECT o.user_id, o.status INTO v_order_user, v_order_status
      FROM public.orders o WHERE o.id = NEW.order_id;

      SELECT client_id INTO v_client_id
      FROM public.invoices WHERE id = NEW.invoice_id;

      IF v_order_user IS NULL THEN
        RAISE EXCEPTION 'Order not found.' USING ERRCODE = 'P0001';
      END IF;
      IF v_order_user <> v_client_id THEN
        RAISE EXCEPTION 'Order does not belong to this invoice''s client.'
          USING ERRCODE = 'P0001';
      END IF;
      IF v_order_status NOT IN ('published', 'completed') THEN
        RAISE EXCEPTION 'Only published or completed orders can be added to an invoice.'
          USING ERRCODE = 'P0001';
      END IF;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- On invoice_items: fires BEFORE to block before any row changes
DROP TRIGGER IF EXISTS enforce_invoice_items_mutability ON public.invoice_items;
CREATE TRIGGER enforce_invoice_items_mutability
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_mutability();

-- On invoices themselves: fires BEFORE UPDATE/DELETE
DROP TRIGGER IF EXISTS enforce_invoice_row_mutability ON public.invoices;
CREATE TRIGGER enforce_invoice_row_mutability
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_mutability();

-- ============================================================
-- 11. Rewrite handle_invoice_paid: flip ALL attached orders
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, now());

    UPDATE public.orders
    SET status       = 'completed',
        completed_at = now()
    WHERE id IN (
      SELECT order_id FROM public.invoice_items WHERE invoice_id = NEW.id
    )
    AND status = 'published';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_status_changed ON public.invoices;
CREATE TRIGGER on_invoice_status_changed
  BEFORE UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invoice_paid();

-- ============================================================
-- 12. generate_monthly_invoices function (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_monthly_invoices(p_billing_month DATE)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start DATE;
  v_month_end   DATE;
  v_due_date    DATE;
  v_invoice_id  UUID;
  v_count       INT := 0;
  r             RECORD;
BEGIN
  v_month_start := date_trunc('month', p_billing_month)::date;
  v_month_end   := (v_month_start + INTERVAL '1 month')::date;
  v_due_date    := (v_month_start + INTERVAL '1 month' + INTERVAL '14 days')::date;

  FOR r IN
    SELECT DISTINCT o.user_id AS client_id
    FROM public.orders o
    WHERE o.status        = 'published'
      AND o.publish_date >= v_month_start
      AND o.publish_date <  v_month_end
      AND NOT EXISTS (
        SELECT 1 FROM public.invoice_items ii WHERE ii.order_id = o.id
      )
  LOOP
    -- Upsert invoice for this client/month
    INSERT INTO public.invoices (client_id, billing_month, status, generated_at, due_date)
    VALUES (r.client_id, v_month_start, 'draft', now(), v_due_date)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_invoice_id;

    -- If there was a conflict (existing draft), look it up
    IF v_invoice_id IS NULL THEN
      SELECT id INTO v_invoice_id
      FROM public.invoices
      WHERE client_id    = r.client_id
        AND billing_month = v_month_start
        AND status        = 'draft';
    END IF;

    IF v_invoice_id IS NULL THEN
      CONTINUE; -- a sent/paid invoice already exists for this client/month — skip
    END IF;

    -- Insert items for each eligible order
    INSERT INTO public.invoice_items (invoice_id, order_id, site_domain, amount)
    SELECT v_invoice_id, o.id, o.site_domain, o.price
    FROM public.orders o
    WHERE o.status        = 'published'
      AND o.publish_date >= v_month_start
      AND o.publish_date <  v_month_end
      AND o.user_id       = r.client_id
      AND NOT EXISTS (
        SELECT 1 FROM public.invoice_items ii WHERE ii.order_id = o.id
      )
    ON CONFLICT (order_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================================
-- 13. pg_cron: generate previous month's invoices on the 1st at 02:00 UTC
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('generate-monthly-invoices');
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'generate-monthly-invoices',
      '0 2 1 * *',
      $$SELECT public.generate_monthly_invoices(
        (date_trunc('month', now() - interval '1 month'))::date
      );$$
    );
  END IF;
EXCEPTION WHEN undefined_function THEN
  NULL;
END;
$$;

-- ============================================================
-- 14. Partial unique index: at most one draft per (client, month)
--     (placed after consolidation so it doesn't conflict)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_client_month_draft
  ON public.invoices (client_id, billing_month)
  WHERE status = 'draft';

-- ============================================================
-- 15. RLS — invoices
-- ============================================================

-- Drop all old policies on invoices
DROP POLICY IF EXISTS "invoices_select_own"        ON public.invoices;
DROP POLICY IF EXISTS "invoices_select_admin_mod"   ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_staff"       ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_staff"       ON public.invoices;

-- Client sees only their own sent/paid invoices
CREATE POLICY "invoices_select_client"
  ON public.invoices FOR SELECT
  USING (
    client_id = auth.uid()
    AND status IN ('sent', 'paid')
  );

-- Staff sees all
CREATE POLICY "invoices_select_staff"
  ON public.invoices FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- Only staff may update
CREATE POLICY "invoices_update_staff"
  ON public.invoices FOR UPDATE
  USING  (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

-- INSERT/DELETE are service-role only (no client/staff policy = service role only)

-- ============================================================
-- 16. RLS — invoice_items
-- ============================================================

DROP POLICY IF EXISTS "invoice_items_select_own"   ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_select_staff"  ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_update_staff"  ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_insert_staff"  ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete_staff"  ON public.invoice_items;

-- Client sees items only for their own sent/paid invoices
CREATE POLICY "invoice_items_select_client"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE client_id = auth.uid()
        AND status IN ('sent', 'paid')
    )
  );

-- Staff sees all
CREATE POLICY "invoice_items_select_staff"
  ON public.invoice_items FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- Staff manage items (trigger enforces draft-only)
CREATE POLICY "invoice_items_insert_staff"
  ON public.invoice_items FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

CREATE POLICY "invoice_items_update_staff"
  ON public.invoice_items FOR UPDATE
  USING  (public.get_my_role() IN ('admin', 'manager'))
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

CREATE POLICY "invoice_items_delete_staff"
  ON public.invoice_items FOR DELETE
  USING (public.get_my_role() IN ('admin', 'manager'));
