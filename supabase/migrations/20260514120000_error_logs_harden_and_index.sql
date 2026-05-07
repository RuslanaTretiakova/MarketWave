-- Harden error_logs: service-role-only inserts + query indexes.

-- Drop the authenticated-user INSERT policy.
-- adminClient (service role) bypasses RLS entirely — no INSERT policy is needed.
DROP POLICY IF EXISTS "error_logs_insert_authenticated" ON public.error_logs;

-- Composite index: admin queries filtered by context, ordered by time.
CREATE INDEX IF NOT EXISTS error_logs_context_created_at_idx
  ON public.error_logs (context, created_at DESC);

-- Time-range scan index.
CREATE INDEX IF NOT EXISTS error_logs_created_at_idx
  ON public.error_logs (created_at DESC);
