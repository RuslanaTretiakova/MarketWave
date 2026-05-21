-- Remove managers from system-managed sales rooms who are not the
-- currently assigned account_manager for that client.
DELETE FROM public.chat_room_participants crp
USING public.chat_rooms cr
WHERE cr.channel = 'sales'
  AND cr.system_managed = true
  AND cr.onboarding_for_user_id IS NOT NULL
  AND crp.room_id = cr.id
  AND crp.user_id != cr.onboarding_for_user_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = crp.user_id AND p.role = 'manager'
  )
  AND crp.user_id IS DISTINCT FROM (
    SELECT account_manager_id
    FROM public.profiles
    WHERE id = cr.onboarding_for_user_id
  );
