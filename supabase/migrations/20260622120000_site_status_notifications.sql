-- Add site-related notification events
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'site_needs_changes';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'site_approved';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'site_archived';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'site_unarchived';

-- Add site_id FK to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;
