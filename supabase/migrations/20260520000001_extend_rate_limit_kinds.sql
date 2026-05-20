-- Extend the CHECK constraint to cover authenticated high-frequency actions.
-- cart_mutation: per-user cart add/remove/update (60 per minute)
-- content_save:  per-user draft saves (120 per 5 minutes)

ALTER TABLE public.public_rate_limit_events
  DROP CONSTRAINT public_rate_limit_events_kind_check;

ALTER TABLE public.public_rate_limit_events
  ADD CONSTRAINT public_rate_limit_events_kind_check
  CHECK (kind IN (
    'password_reset',
    'client_error',
    'set_password',
    'cart_mutation',
    'content_save'
  ));
