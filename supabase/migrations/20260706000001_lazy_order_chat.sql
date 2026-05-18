-- Order chat rooms are now created lazily via the "Start Chat" button on the
-- Order detail page, not automatically on order insert.
DROP TRIGGER IF EXISTS on_order_created_chat_room ON public.orders;
DROP FUNCTION IF EXISTS public.handle_new_order_chat_room();
