import type { OrgUserRowJson } from '@/lib/org-users/types'

/** Email to use for resend-invite API (mirror + auth fallback). */
export function orgUserResendInviteEmail(row: OrgUserRowJson): string {
  return (row.email?.trim() || row.profile_email?.trim() || '').trim()
}

export function orgUserCanResendInvite(row: OrgUserRowJson): boolean {
  if (row.role === 'admin') return false
  if (row.banned_until && new Date(row.banned_until) > new Date()) return false
  if (!orgUserResendInviteEmail(row)) return false
  return row.require_password_change === true
}
