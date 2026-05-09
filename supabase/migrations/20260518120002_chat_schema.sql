-- Realtime chat: rooms, participants, messages, attachments, per-user read markers.
-- Designed to be participant-scoped via RLS so admins/managers join order rooms
-- automatically (trigger), and only members of a room can SELECT/INSERT messages.

-- ─── enums ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_room_kind') THEN
    CREATE TYPE public.chat_room_kind AS ENUM ('order', 'direct', 'group');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_message_type') THEN
    CREATE TYPE public.chat_message_type AS ENUM ('text', 'system');
  END IF;
END $$;

-- ─── tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        public.chat_room_kind NOT NULL,
  order_id    UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Order rooms are 1:1 per order
  CONSTRAINT chat_rooms_order_unique UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_order ON public.chat_rooms (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_rooms_kind  ON public.chat_rooms (kind);

CREATE TABLE IF NOT EXISTS public.chat_room_participants (
  room_id    UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_participants_user ON public.chat_room_participants (user_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  message_type public.chat_message_type NOT NULL DEFAULT 'text',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time
  ON public.chat_messages (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_message_attachments (message_id);

-- One last-read marker per (room, user) — used to compute unread counts
CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  room_id     UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- ─── helper: is_chat_participant ───────────────────────────────────────────────
-- Avoids RLS recursion by running with definer rights; only checks membership.
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_room_participants
    WHERE room_id = p_room_id AND user_id = p_user_id
  );
$$;

-- ─── updated_at triggers ───────────────────────────────────────────────────────
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── triggers: auto-create / sync order room ───────────────────────────────────
-- When an order is created, open a chat room and seed participants:
--   client (order.user_id) + every admin + every manager + assigned copywriter.
CREATE OR REPLACE FUNCTION public.handle_new_order_chat_room()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_room_id UUID;
BEGIN
  INSERT INTO public.chat_rooms (kind, order_id, title)
  VALUES ('order', NEW.id, NEW.site_domain)
  RETURNING id INTO new_room_id;

  -- Client + assigned copywriter
  INSERT INTO public.chat_room_participants (room_id, user_id)
  VALUES (new_room_id, NEW.user_id)
  ON CONFLICT DO NOTHING;

  IF NEW.copywriter_id IS NOT NULL THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (new_room_id, NEW.copywriter_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- All admins + managers
  INSERT INTO public.chat_room_participants (room_id, user_id)
  SELECT new_room_id, p.id FROM public.profiles p
  WHERE p.role IN ('admin', 'manager')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_created_chat_room
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_chat_room();

-- When a copywriter is assigned/reassigned, add them to the order room and post a system message.
CREATE OR REPLACE FUNCTION public.handle_order_copywriter_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  the_room_id UUID;
  prev_name TEXT;
  new_name TEXT;
  body TEXT;
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

    SELECT full_name INTO prev_name FROM public.profiles WHERE id = OLD.copywriter_id;
    SELECT full_name INTO new_name  FROM public.profiles WHERE id = NEW.copywriter_id;

    IF NEW.copywriter_id IS NULL THEN
      body := 'Copywriter unassigned' || CASE WHEN prev_name IS NOT NULL THEN ' (was ' || prev_name || ')' ELSE '' END || '.';
    ELSIF OLD.copywriter_id IS NULL THEN
      body := 'Copywriter assigned' || CASE WHEN new_name IS NOT NULL THEN ': ' || new_name ELSE '' END || '.';
    ELSE
      body := 'Copywriter reassigned'
        || CASE WHEN prev_name IS NOT NULL THEN ' from ' || prev_name ELSE '' END
        || CASE WHEN new_name  IS NOT NULL THEN ' to '   || new_name  ELSE '' END
        || '.';
    END IF;

    INSERT INTO public.chat_messages (room_id, sender_id, body, message_type)
    VALUES (the_room_id, NULL, body, 'system');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_copywriter_changed
  AFTER UPDATE OF copywriter_id ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_copywriter_change();

-- New admins/managers should be auto-added to all existing order rooms so they don't
-- start blind to historic chats.
CREATE OR REPLACE FUNCTION public.handle_new_staff_chat_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IN ('admin', 'manager') THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    SELECT r.id, NEW.id FROM public.chat_rooms r WHERE r.kind = 'order'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_set_chat_join
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_chat_join();

CREATE OR REPLACE FUNCTION public.handle_profile_role_change_chat_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role IN ('admin', 'manager') THEN
    INSERT INTO public.chat_room_participants (room_id, user_id)
    SELECT r.id, NEW.id FROM public.chat_rooms r WHERE r.kind = 'order'
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_changed_chat_join
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_change_chat_join();

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_reads         ENABLE ROW LEVEL SECURITY;

-- chat_rooms: members can SELECT; admin can SELECT all.
CREATE POLICY "chat_rooms_select_member" ON public.chat_rooms
  FOR SELECT
  USING (public.is_chat_participant(id, auth.uid()) OR public.get_my_role() = 'admin');

-- chat_room_participants: visible to fellow participants (via the helper)
CREATE POLICY "chat_room_participants_select" ON public.chat_room_participants
  FOR SELECT
  USING (public.is_chat_participant(room_id, auth.uid()) OR public.get_my_role() = 'admin');

-- Members can leave themselves (DELETE own row); admin/manager add via service-role action.
CREATE POLICY "chat_room_participants_delete_self" ON public.chat_room_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- chat_messages: SELECT/INSERT only for participants
CREATE POLICY "chat_messages_select_participant" ON public.chat_messages
  FOR SELECT
  USING (public.is_chat_participant(room_id, auth.uid()) OR public.get_my_role() = 'admin');

CREATE POLICY "chat_messages_insert_participant" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    public.is_chat_participant(room_id, auth.uid())
    AND sender_id = auth.uid()
    AND message_type = 'text'
  );

-- Allow senders to delete their own messages within 5 minutes (soft "unsend")
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages
  FOR DELETE
  USING (
    sender_id = auth.uid()
    AND created_at > now() - interval '5 minutes'
  );

-- chat_message_attachments: piggybacks on parent message visibility
CREATE POLICY "chat_attachments_select_via_message" ON public.chat_message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_attachments.message_id
        AND (public.is_chat_participant(m.room_id, auth.uid()) OR public.get_my_role() = 'admin')
    )
  );

CREATE POLICY "chat_attachments_insert_own" ON public.chat_message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_attachments.message_id
        AND m.sender_id = auth.uid()
    )
  );

-- chat_room_reads: a user manages only their own marker
CREATE POLICY "chat_room_reads_select_own" ON public.chat_room_reads
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "chat_room_reads_upsert_own" ON public.chat_room_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_chat_participant(room_id, auth.uid()));

CREATE POLICY "chat_room_reads_update_own" ON public.chat_room_reads
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Realtime publication ─────────────────────────────────────────────────────
-- Add tables to the supabase_realtime publication so client subscriptions receive
-- INSERT/UPDATE events. Wrapped in DO blocks so re-running the migration is safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_reads';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ─── Backfill: create chat rooms for existing orders ───────────────────────────
DO $$
DECLARE
  o RECORD;
  new_room_id UUID;
BEGIN
  FOR o IN
    SELECT o.* FROM public.orders o
    LEFT JOIN public.chat_rooms r ON r.order_id = o.id
    WHERE r.id IS NULL
  LOOP
    INSERT INTO public.chat_rooms (kind, order_id, title)
    VALUES ('order', o.id, o.site_domain)
    RETURNING id INTO new_room_id;

    INSERT INTO public.chat_room_participants (room_id, user_id)
    VALUES (new_room_id, o.user_id)
    ON CONFLICT DO NOTHING;

    IF o.copywriter_id IS NOT NULL THEN
      INSERT INTO public.chat_room_participants (room_id, user_id)
      VALUES (new_room_id, o.copywriter_id)
      ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.chat_room_participants (room_id, user_id)
    SELECT new_room_id, p.id FROM public.profiles p WHERE p.role IN ('admin', 'manager')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
