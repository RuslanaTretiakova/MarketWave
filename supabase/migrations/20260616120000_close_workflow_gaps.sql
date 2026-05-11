-- Close workflow implementation gaps:
-- - lifecycle timestamps on orders
-- - status transition audit trail
-- - structured change-request resolution metadata
-- - in-app notifications
-- - invoice/order synchronization guardrails

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status NOT NULL,
  to_status public.order_status NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created
  ON public.order_status_history (order_id, created_at DESC);

ALTER TABLE public.change_requests
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_event') THEN
    CREATE TYPE public.notification_event AS ENUM (
      'copywriter_assigned',
      'copywriter_reassigned',
      'content_submitted',
      'changes_requested',
      'content_approved',
      'order_published',
      'invoice_paid'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event public.notification_event NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  change_request_id UUID REFERENCES public.change_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_status_history_select_order_visible" ON public.order_status_history;
CREATE POLICY "order_status_history_select_order_visible"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND (
          o.user_id = auth.uid()
          OR o.copywriter_id = auth.uid()
          OR public.get_my_role() IN ('admin', 'manager')
        )
    )
  );

DROP POLICY IF EXISTS "order_status_history_insert_staff_only" ON public.order_status_history;
CREATE POLICY "order_status_history_insert_staff_only"
  ON public.order_status_history FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_staff" ON public.notifications;
CREATE POLICY "notifications_insert_staff"
  ON public.notifications FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;
CREATE POLICY "notifications_delete_admin"
  ON public.notifications FOR DELETE
  USING (public.get_my_role() = 'admin');

CREATE OR REPLACE FUNCTION public.apply_order_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.copywriter_id IS NOT NULL AND (OLD.copywriter_id IS NULL OR OLD.copywriter_id IS DISTINCT FROM NEW.copywriter_id) THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'content_sent' THEN NEW.content_submitted_at := COALESCE(NEW.content_submitted_at, now());
      WHEN 'content_approved' THEN NEW.approved_at := COALESCE(NEW.approved_at, now());
      WHEN 'published' THEN NEW.published_at := COALESCE(NEW.published_at, now());
      WHEN 'completed' THEN NEW.completed_at := COALESCE(NEW.completed_at, now());
      WHEN 'canceled' THEN NEW.canceled_at := COALESCE(NEW.canceled_at, now());
      ELSE NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_orders_apply_timestamps ON public.orders;
CREATE TRIGGER on_orders_apply_timestamps
  BEFORE UPDATE OF status, copywriter_id ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_order_timestamps();

CREATE OR REPLACE FUNCTION public.audit_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor_id := auth.uid();

    INSERT INTO public.order_status_history (
      order_id, from_status, to_status, actor_user_id
    )
    VALUES (
      NEW.id, OLD.status, NEW.status, actor_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_orders_status_audit ON public.orders;
CREATE TRIGGER on_orders_status_audit
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_order_status_transition();

CREATE OR REPLACE FUNCTION public.create_order_event_notification(
  p_event public.notification_event,
  p_order_id UUID,
  p_actor_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_invoice_id UUID DEFAULT NULL,
  p_change_request_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, user_id, copywriter_id
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  IF v_order.id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    actor_user_id,
    event,
    title,
    message,
    order_id,
    invoice_id,
    change_request_id
  )
  SELECT DISTINCT recipient_id, p_actor_user_id, p_event, p_title, p_message, p_order_id, p_invoice_id, p_change_request_id
  FROM (
    SELECT v_order.user_id AS recipient_id
    UNION ALL
    SELECT v_order.copywriter_id AS recipient_id
    UNION ALL
    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager')
  ) recipients
  WHERE recipient_id IS NOT NULL
    AND (p_actor_user_id IS NULL OR recipient_id <> p_actor_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_actor UUID;
  v_title TEXT;
  v_message TEXT;
  v_event public.notification_event;
BEGIN
  v_actor := auth.uid();

  IF NEW.copywriter_id IS DISTINCT FROM OLD.copywriter_id THEN
    IF OLD.copywriter_id IS NULL AND NEW.copywriter_id IS NOT NULL THEN
      v_event := 'copywriter_assigned';
      v_title := 'Copywriter assigned';
      v_message := 'A copywriter was assigned to this order.';
    ELSIF OLD.copywriter_id IS NOT NULL AND NEW.copywriter_id IS NOT NULL THEN
      v_event := 'copywriter_reassigned';
      v_title := 'Copywriter reassigned';
      v_message := 'The copywriter assignment was changed.';
    ELSE
      v_event := NULL;
    END IF;

    IF v_event IS NOT NULL THEN
      PERFORM public.create_order_event_notification(
        v_event,
        NEW.id,
        v_actor,
        v_title,
        v_message
      );
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'content_sent' THEN
      v_event := 'content_submitted';
      v_title := 'Content submitted';
      v_message := 'New content has been submitted for review.';
    ELSIF NEW.status = 'needs_changes' THEN
      v_event := 'changes_requested';
      v_title := 'Changes requested';
      v_message := 'Client requested changes to submitted content.';
    ELSIF NEW.status = 'content_approved' THEN
      v_event := 'content_approved';
      v_title := 'Content approved';
      v_message := 'Client approved the submitted content.';
    ELSIF NEW.status = 'published' THEN
      v_event := 'order_published';
      v_title := 'Order published';
      v_message := 'The order has been marked as published.';
    ELSE
      v_event := NULL;
    END IF;

    IF v_event IS NOT NULL THEN
      PERFORM public.create_order_event_notification(
        v_event,
        NEW.id,
        v_actor,
        v_title,
        v_message
      );

      SELECT id INTO v_room_id FROM public.chat_rooms WHERE order_id = NEW.id;
      IF v_room_id IS NOT NULL THEN
        INSERT INTO public.chat_messages (room_id, sender_id, body, message_type)
        VALUES (v_room_id, NULL, v_title || '. ' || v_message, 'system');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_notify_update ON public.orders;
CREATE TRIGGER on_order_notify_update
  AFTER UPDATE OF status, copywriter_id ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_order_update();

CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM public.create_order_event_notification(
      'invoice_paid',
      NEW.order_id,
      auth.uid(),
      'Invoice paid',
      'The invoice for this order has been marked as paid.',
      NEW.id,
      NULL
    );

    SELECT id INTO v_room_id FROM public.chat_rooms WHERE order_id = NEW.order_id;
    IF v_room_id IS NOT NULL THEN
      INSERT INTO public.chat_messages (room_id, sender_id, body, message_type)
      VALUES (v_room_id, NULL, 'Invoice paid. The order is now ready for completion workflows.', 'system');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_invoice_notify_paid ON public.invoices;
CREATE TRIGGER on_invoice_notify_paid
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_paid();

CREATE OR REPLACE FUNCTION public.set_change_request_resolution_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('resolved', 'dismissed') THEN
    NEW.resolved_at := COALESCE(NEW.resolved_at, now());
    NEW.resolved_by := COALESCE(NEW.resolved_by, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_change_request_resolution_fields ON public.change_requests;
CREATE TRIGGER on_change_request_resolution_fields
  BEFORE UPDATE OF status ON public.change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_change_request_resolution_fields();

CREATE OR REPLACE FUNCTION public.notify_change_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  PERFORM public.create_order_event_notification(
    'changes_requested',
    NEW.order_id,
    NEW.user_id,
    'Changes requested',
    'A new change request was submitted.',
    NULL,
    NEW.id
  );

  SELECT id INTO v_room_id FROM public.chat_rooms WHERE order_id = NEW.order_id;
  IF v_room_id IS NOT NULL THEN
    INSERT INTO public.chat_messages (room_id, sender_id, body, message_type)
    VALUES (v_room_id, NULL, 'Client submitted a change request.', 'system');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_change_request_notify_insert ON public.change_requests;
CREATE TRIGGER on_change_request_notify_insert
  AFTER INSERT ON public.change_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_change_request_insert();

CREATE OR REPLACE FUNCTION public.sync_draft_invoice_item_from_order_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    SELECT id, status INTO v_invoice
    FROM public.invoices
    WHERE order_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invoice.id IS NOT NULL THEN
      IF v_invoice.status <> 'draft' THEN
        RAISE EXCEPTION 'Cannot change order price after invoice is sent or paid.'
          USING ERRCODE = 'P0001';
      END IF;

      UPDATE public.invoice_items
      SET amount = NEW.price,
          site_domain = COALESCE(NEW.site_domain, site_domain)
      WHERE invoice_id = v_invoice.id
        AND order_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_price_sync_invoice ON public.orders;
CREATE TRIGGER on_order_price_sync_invoice
  AFTER UPDATE OF price, site_domain ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_draft_invoice_item_from_order_price();
