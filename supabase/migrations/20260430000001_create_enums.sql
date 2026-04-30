-- Roles
CREATE TYPE public.user_role AS ENUM ('client', 'admin', 'moderator');

-- Order lifecycle
CREATE TYPE public.order_status AS ENUM (
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
  'completed',
  'canceled'
);

-- Invoice payment
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue', 'canceled');

-- Site listing
CREATE TYPE public.site_status AS ENUM ('active', 'inactive', 'pending_review');

-- Change request
CREATE TYPE public.change_request_status AS ENUM ('open', 'resolved', 'dismissed');

-- Link type
CREATE TYPE public.link_type AS ENUM ('dofollow', 'nofollow', 'sponsored', 'ugc');
