-- Add invoice_sent notification event so clients are notified when an invoice is sent.
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'invoice_sent';
