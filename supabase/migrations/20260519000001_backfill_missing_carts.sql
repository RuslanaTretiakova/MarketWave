-- One-time backfill: create a cart for every profile that doesn't have one.
-- Normally the handle_new_profile trigger does this on profile INSERT,
-- but it may not have fired for users created before the trigger was installed.
INSERT INTO public.carts (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.carts);
