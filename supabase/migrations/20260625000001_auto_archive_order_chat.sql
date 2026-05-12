-- Auto-archive the order chat room when an order reaches a terminal status.
-- This prevents users from sending new messages on completed or canceled orders.
-- Chat is for user-to-user text only; order event alerting is handled by notifications.
CREATE OR REPLACE FUNCTION public.archive_order_chat_on_terminal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('completed', 'canceled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.chat_rooms
    SET status = 'archived', updated_at = now()
    WHERE order_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_terminal_archive_chat ON public.orders;
CREATE TRIGGER on_order_terminal_archive_chat
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_order_chat_on_terminal();
