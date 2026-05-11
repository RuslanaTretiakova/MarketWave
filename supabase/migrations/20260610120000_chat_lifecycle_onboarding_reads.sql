-- Chat lifecycle (active/archived), onboarding chat linkage, per-message read receipts,
-- account manager on profiles, and RLS tweaks for archived rooms.

-- ─── enums ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_room_status') THEN
    CREATE TYPE public.chat_room_status AS ENUM ('active', 'archived');
  END IF;
END $$;

-- ─── profiles: assigned manager (for Sales onboarding chat) ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_manager ON public.profiles (account_manager_id)
  WHERE account_manager_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profiles_guard_account_manager_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_manager_id IS DISTINCT FROM OLD.account_manager_id THEN
    IF auth.role() IS DISTINCT FROM 'service_role' AND public.get_my_role() <> 'admin' THEN
      RAISE EXCEPTION 'Only admins can change account_manager_id' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.account_manager_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles m WHERE m.id = NEW.account_manager_id AND m.role = 'manager'
      ) THEN
        RAISE EXCEPTION 'account_manager_id must reference a manager' USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_account_manager ON public.profiles;
CREATE TRIGGER profiles_guard_account_manager
  BEFORE UPDATE OF account_manager_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_account_manager_change();

-- ─── chat_rooms: status, system flag, onboarding anchor ────────────────────────
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS status public.chat_room_status NOT NULL DEFAULT 'active';

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS system_managed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS onboarding_for_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_status ON public.chat_rooms (status);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_onboarding_user ON public.chat_rooms (onboarding_for_user_id)
  WHERE onboarding_for_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_onboarding_channel_unique
  ON public.chat_rooms (onboarding_for_user_id, channel)
  WHERE onboarding_for_user_id IS NOT NULL;

-- ─── per-message read receipts (synced from chat_room_reads marker) ───────────
CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message ON public.chat_message_reads (message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user ON public.chat_message_reads (user_id);

ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_message_reads_select_participant"
  ON public.chat_message_reads
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reads.message_id
        AND (public.is_chat_participant(m.room_id, auth.uid()) OR public.get_my_role() = 'admin')
    )
  );

-- Inserts are performed by trigger (definer); optional direct insert for own reads:
CREATE POLICY "chat_message_reads_insert_own_participant"
  ON public.chat_message_reads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = chat_message_reads.message_id
        AND public.is_chat_participant(m.room_id, auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.sync_chat_message_reads_from_marker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_message_reads (message_id, user_id, read_at)
  SELECT m.id, NEW.user_id, NEW.last_read_at
  FROM public.chat_messages m
  WHERE m.room_id = NEW.room_id
    AND m.sender_id IS DISTINCT FROM NEW.user_id
    AND m.created_at <= NEW.last_read_at
  ON CONFLICT (message_id, user_id) DO UPDATE
  SET read_at = GREATEST(chat_message_reads.read_at, EXCLUDED.read_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_room_reads_sync_message_reads ON public.chat_room_reads;
CREATE TRIGGER trg_chat_room_reads_sync_message_reads
  AFTER INSERT OR UPDATE OF last_read_at ON public.chat_room_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chat_message_reads_from_marker();

-- ─── Backfill read receipts from existing markers (best-effort) ─────────────────
INSERT INTO public.chat_message_reads (message_id, user_id, read_at)
SELECT m.id, cr.user_id, cr.last_read_at
FROM public.chat_room_reads cr
JOIN public.chat_messages m ON m.room_id = cr.room_id
WHERE m.sender_id IS DISTINCT FROM cr.user_id
  AND m.created_at <= cr.last_read_at
ON CONFLICT (message_id, user_id) DO UPDATE
SET read_at = GREATEST(chat_message_reads.read_at, EXCLUDED.read_at);

-- ─── RLS: block new messages in archived rooms (user JWT path) ─────────────────
DROP POLICY IF EXISTS "chat_messages_insert_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_participant" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    public.is_chat_participant(room_id, auth.uid())
    AND sender_id = auth.uid()
    AND message_type = 'text'
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms r
      WHERE r.id = chat_messages.room_id
        AND r.status = 'active'::public.chat_room_status
    )
  );

DROP POLICY IF EXISTS "chat_attachments_insert_own" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_insert_own" ON public.chat_message_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.chat_rooms r ON r.id = m.room_id
      WHERE m.id = chat_message_attachments.message_id
        AND m.sender_id = auth.uid()
        AND r.status = 'active'::public.chat_room_status
    )
  );
