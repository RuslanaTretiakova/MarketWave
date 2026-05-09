-- Private bucket for chat attachments. Path convention: <room_id>/<uuid>-<filename>
-- so RLS can extract the room id from the first path segment and verify membership.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'text/markdown'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "chat_attachments_select_member" ON storage.objects;
CREATE POLICY "chat_attachments_select_member"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND public.is_chat_participant(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_attachments_insert_member" ON storage.objects;
CREATE POLICY "chat_attachments_insert_member"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND public.is_chat_participant(
      (split_part(name, '/', 1))::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_attachments_delete_own" ON storage.objects;
CREATE POLICY "chat_attachments_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND owner = auth.uid()
  );
