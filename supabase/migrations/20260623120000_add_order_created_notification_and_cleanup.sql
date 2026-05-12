-- Add order_created enum value
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'order_created';

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Weekly cleanup: delete read notifications older than 7 days (Sundays 03:00 UTC)
SELECT cron.schedule(
  'cleanup-read-notifications',
  '0 3 * * 0',
  $$DELETE FROM public.notifications WHERE read_at IS NOT NULL AND read_at < now() - interval '7 days'$$
);
