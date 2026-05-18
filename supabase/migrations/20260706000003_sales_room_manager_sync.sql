-- When a client's account manager is changed, swap participants in their Sales room:
-- remove the old manager, add the new one. Room history is preserved.
CREATE OR REPLACE FUNCTION public.handle_account_manager_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_room_id UUID;
BEGIN
  IF NEW.account_manager_id IS NOT DISTINCT FROM OLD.account_manager_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_room_id
  FROM public.chat_rooms
  WHERE onboarding_for_user_id = NEW.id AND channel = 'sales';

  IF v_room_id IS NULL THEN RETURN NEW; END IF;

  IF OLD.account_manager_id IS NOT NULL THEN
    DELETE FROM public.chat_room_participants
    WHERE room_id = v_room_id AND user_id = OLD.account_manager_id;
  END IF;

  IF NEW.account_manager_id IS NOT NULL THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (v_room_id, NEW.account_manager_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_manager_changed
  AFTER UPDATE OF account_manager_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_account_manager_change();
