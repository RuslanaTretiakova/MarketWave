-- Rebuild notification flow: app layer is now the single source of truth.
-- Drop DB triggers that emit notifications so we don't get duplicate rows
-- (server actions already emit role-specific copy with narrower recipient
-- lists; the trigger path blasted every admin/manager with a generic message).
--
-- Keeps:
--   * notifications table + RLS + indexes
--   * weekly cleanup cron (20260623120000)
--   * handle_order_copywriter_change (chat participant management, separate concern)

DROP TRIGGER IF EXISTS on_order_notify_update ON public.orders;
DROP TRIGGER IF EXISTS on_invoice_notify_paid ON public.invoices;
DROP TRIGGER IF EXISTS on_change_request_notify_insert ON public.change_requests;

DROP FUNCTION IF EXISTS public.notify_on_order_update();
DROP FUNCTION IF EXISTS public.notify_invoice_paid();
DROP FUNCTION IF EXISTS public.notify_change_request_insert();
DROP FUNCTION IF EXISTS public.create_order_event_notification(
  public.notification_event, UUID, UUID, TEXT, TEXT, UUID, UUID
);

-- Enable realtime so the browser can subscribe to INSERTs filtered by
-- recipient_user_id. RLS still applies on the channel: each user only sees
-- their own rows.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
