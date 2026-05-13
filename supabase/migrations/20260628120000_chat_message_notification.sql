-- Add chat_message notification event for debounced new-message notifications.
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'chat_message';
