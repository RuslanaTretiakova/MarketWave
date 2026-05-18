-- Order chat rooms now include only the client's assigned manager, not all managers.
-- These triggers previously added any new admin OR manager to all existing order rooms;
-- restrict to admins only so managers aren't auto-added to unrelated orders.
CREATE OR REPLACE FUNCTION public.handle_new_staff_chat_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    SELECT r.id, NEW.id FROM public.chat_rooms r WHERE r.kind = 'order'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_role_change_chat_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role = 'admin' THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    SELECT r.id, NEW.id FROM public.chat_rooms r WHERE r.kind = 'order'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
