-- Fix manager RLS on invoices (order_id is NULL for all new multi-order invoices,
-- so the old policy matched nothing). Use client_id instead.
-- Also adds invoice_generated notification event and wires it into
-- generate_monthly_invoices so both the cron job and the manual trigger notify.

-- ============================================================
-- 1. Fix invoices RLS for managers
-- ============================================================

DROP POLICY IF EXISTS "invoices_select_manager_assigned" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_manager_assigned" ON public.invoices;

CREATE POLICY "invoices_select_manager_assigned"
  ON public.invoices FOR SELECT
  USING (
    public.get_my_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
    )
  );

CREATE POLICY "invoices_update_manager_assigned"
  ON public.invoices FOR UPDATE
  USING (
    public.get_my_role() = 'manager'
    AND client_id IN (
      SELECT id FROM public.profiles WHERE account_manager_id = auth.uid()
    )
  );

-- ============================================================
-- 2. Add invoice_generated notification event
-- ============================================================

ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'invoice_generated';

-- ============================================================
-- 3. Replace generate_monthly_invoices with notification support
--    Identical logic to 20260705000001, plus an INSERT into
--    notifications for all admins and managers when v_count > 0.
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

  -- Notify all admins and managers when new invoices were created
  IF v_count > 0 THEN
    INSERT INTO public.notifications (
      recipient_user_id, actor_user_id, event, title, message,
      order_id, invoice_id, change_request_id, site_id
    )
    SELECT
      p.id,
      NULL,
      'invoice_generated'::public.notification_event,
      'Invoices generated',
      v_count || ' invoice' || CASE WHEN v_count = 1 THEN '' ELSE 's' END
        || ' generated for ' || to_char(v_month_start, 'FMMonth YYYY'),
      NULL, NULL, NULL, NULL
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager');
  END IF;

  RETURN v_count;
END;
$$;
