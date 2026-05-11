-- Track last automated invite reminder for cron throttling (service_role updates only in app).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_automated_invite_reminder_at timestamptz;

COMMENT ON COLUMN public.profiles.last_automated_invite_reminder_at IS
  'Set by invite-reminder cron after inviteUserByEmail; used for per-user cooldown. Not updated by manual admin resend.';
