-- Harden error_logs: authenticated inserts must not attribute logs to another user.

DROP POLICY IF EXISTS "error_logs_insert_authenticated" ON public.error_logs;

CREATE POLICY "error_logs_insert_authenticated"
  ON public.error_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (user_id IS NULL OR user_id = auth.uid())
  );
