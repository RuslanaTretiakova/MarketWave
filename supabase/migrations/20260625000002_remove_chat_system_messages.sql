-- Remove system-message inserts from order chat rooms.
-- Order lifecycle events are already handled by the notifications table.
-- Chat should be used for user-to-user text only.

-- 1. Copywriter assignment/reassignment: keep participant management, drop system message.
CREATE OR REPLACE FUNCTION public.handle_order_copywriter_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  the_room_id UUID;
BEGIN
  IF NEW.copywriter_id IS DISTINCT FROM OLD.copywriter_id THEN
    SELECT id INTO the_room_id FROM public.chat_rooms WHERE order_id = NEW.id;
    IF the_room_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NEW.copywriter_id IS NOT NULL THEN
      INSERT INTO public.chat_room_participants (room_id, user_id)
      VALUES (the_room_id, NEW.copywriter_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Order status changes: keep notification inserts, drop system message.
CREATE OR REPLACE FUNCTION public.notify_on_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Invoice paid: keep notification insert, drop system message.
CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Change request submitted: keep notification insert, drop system message.
CREATE OR REPLACE FUNCTION public.notify_change_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;
