/**
 * Minimum password length for Supabase Auth (sign-in password updates, invites, recovery).
 * Must match hosted Supabase: Authentication → Providers → Email → Minimum password length,
 * and `supabase/config.toml` → `minimum_password_length`.
 */
export const AUTH_MIN_PASSWORD_LENGTH = 8
