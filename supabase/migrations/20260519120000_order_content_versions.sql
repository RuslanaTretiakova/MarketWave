-- Copywriter content workflow: a versioned content store per order.
-- One in-flight `draft` row per order (overwritten as the copywriter edits) and
-- a sequence of immutable `submitted` rows (one per submission to the client).
-- RLS is intentionally tighter than the catch-all staff SELECT pattern: drafts
-- are visible only to the assigned copywriter and admin/manager; submitted
-- versions add the order's client owner.

-- ─── enum ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_content_status') THEN
    CREATE TYPE public.order_content_status AS ENUM ('draft', 'submitted');
  END IF;
END $$;

-- ─── table ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_content_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  copywriter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status            public.order_content_status NOT NULL,
  -- Submitted rows get a per-order monotonically increasing version_number;
  -- drafts leave it NULL and rely on the partial unique index below.
  version_number    INTEGER,
  title             TEXT NOT NULL DEFAULT '',
  meta_description  TEXT NOT NULL DEFAULT '',
  body_html         TEXT NOT NULL DEFAULT '',
  word_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_content_versions_submitted_has_number
    CHECK (status <> 'submitted' OR version_number IS NOT NULL),
  CONSTRAINT order_content_versions_draft_no_number
    CHECK (status <> 'draft' OR version_number IS NULL),
  CONSTRAINT order_content_versions_word_count_nonneg
    CHECK (word_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_content_versions_one_draft_per_order
  ON public.order_content_versions (order_id)
  WHERE status = 'draft';

CREATE UNIQUE INDEX IF NOT EXISTS order_content_versions_submitted_unique
  ON public.order_content_versions (order_id, version_number)
  WHERE status = 'submitted';

CREATE INDEX IF NOT EXISTS idx_order_content_versions_order
  ON public.order_content_versions (order_id);

CREATE INDEX IF NOT EXISTS idx_order_content_versions_copywriter
  ON public.order_content_versions (copywriter_id);

-- ─── triggers ──────────────────────────────────────────────────────────────────
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_content_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Submitted versions are immutable: no field changes, no deletes.
CREATE OR REPLACE FUNCTION public.enforce_submitted_content_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'Submitted content versions cannot be deleted'
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'submitted' THEN
    -- updated_at refresh from set_updated_at runs before us; allow only that.
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
       OR NEW.body_html IS DISTINCT FROM OLD.body_html
       OR NEW.word_count IS DISTINCT FROM OLD.word_count
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.copywriter_id IS DISTINCT FROM OLD.copywriter_id
       OR NEW.order_id IS DISTINCT FROM OLD.order_id THEN
      RAISE EXCEPTION 'Submitted content versions are read-only'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER enforce_submitted_content_immutable_upd
  BEFORE UPDATE ON public.order_content_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submitted_content_immutable();

CREATE TRIGGER enforce_submitted_content_immutable_del
  BEFORE DELETE ON public.order_content_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submitted_content_immutable();

-- ─── allow needs_changes → content_sent (copywriter direct re-submit) ──────────
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  valid_next TEXT[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  valid_next := CASE OLD.status
    WHEN 'new'              THEN ARRAY['in_progress', 'canceled']
    WHEN 'in_progress'      THEN ARRAY['content_sent']
    WHEN 'content_sent'     THEN ARRAY['content_approved', 'needs_changes']
    WHEN 'needs_changes'    THEN ARRAY['in_progress', 'content_sent']
    WHEN 'content_approved' THEN ARRAY['published']
    WHEN 'published'        THEN ARRAY[]::TEXT[]
    WHEN 'completed'        THEN ARRAY[]::TEXT[]
    WHEN 'canceled'         THEN ARRAY[]::TEXT[]
    ELSE ARRAY[]::TEXT[]
  END;

  IF NOT (NEW.status::TEXT = ANY(valid_next)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %', OLD.status, NEW.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.order_content_versions ENABLE ROW LEVEL SECURITY;

-- Assigned copywriter sees their drafts and submitted versions.
CREATE POLICY "order_content_versions_select_copywriter"
  ON public.order_content_versions FOR SELECT
  USING (
    public.get_my_role() = 'copywriter'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_content_versions.order_id
        AND o.copywriter_id = auth.uid()
    )
  );

-- Client owner sees only submitted versions for their order.
CREATE POLICY "order_content_versions_select_client"
  ON public.order_content_versions FOR SELECT
  USING (
    status = 'submitted'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_content_versions.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Admin / manager always see everything.
CREATE POLICY "order_content_versions_select_staff"
  ON public.order_content_versions FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- Assigned copywriter can write drafts via supabase client.
-- Submitted rows are inserted via Server Action with adminClient (service role).
CREATE POLICY "order_content_versions_insert_draft_copywriter"
  ON public.order_content_versions FOR INSERT
  WITH CHECK (
    status = 'draft'
    AND copywriter_id = auth.uid()
    AND public.get_my_role() = 'copywriter'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_content_versions.order_id
        AND o.copywriter_id = auth.uid()
        AND o.status IN ('in_progress', 'needs_changes')
    )
  );

CREATE POLICY "order_content_versions_update_draft_copywriter"
  ON public.order_content_versions FOR UPDATE
  USING (
    status = 'draft'
    AND copywriter_id = auth.uid()
    AND public.get_my_role() = 'copywriter'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_content_versions.order_id
        AND o.copywriter_id = auth.uid()
        AND o.status IN ('in_progress', 'needs_changes')
    )
  )
  WITH CHECK (
    status = 'draft'
    AND copywriter_id = auth.uid()
  );

CREATE POLICY "order_content_versions_delete_draft_copywriter"
  ON public.order_content_versions FOR DELETE
  USING (
    status = 'draft'
    AND copywriter_id = auth.uid()
    AND public.get_my_role() = 'copywriter'
  );

COMMENT ON TABLE public.order_content_versions IS
  'Copywriter article content per order: one draft (mutable) plus immutable submitted versions, numbered per order.';
