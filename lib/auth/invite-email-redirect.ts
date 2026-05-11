import { getSiteOrigin } from '@/lib/site-url'

/** Supabase `redirectTo` for invite and invite-resend emails (callback → first password). */
export function getInviteEmailRedirectTo(): string {
  return `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/first-login-password')}&flow=${encodeURIComponent('invite')}`
}
