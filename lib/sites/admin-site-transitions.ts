import type { Database } from '@/lib/supabase/types'

import type { SiteAdminTransition } from '@/lib/sites/site-actions'

type SiteStatus = Database['public']['Enums']['site_status']

/** Admin-only status actions available for a catalog row’s current status. */
export function siteAdminTransitions(status: SiteStatus): SiteAdminTransition[] {
  switch (status) {
    case 'archived':
      return ['activate']
    case 'active':
      return ['needs_changes', 'archive']
    case 'needs_changes':
      return ['approve', 'activate', 'archive']
    case 'approved':
      return ['activate', 'needs_changes', 'archive']
    case 'pending_review':
      return ['needs_changes', 'approve', 'archive']
    default:
      return ['activate', 'archive']
  }
}

export function siteAdminTransitionMenuLabel(
  rowStatus: SiteStatus,
  t: SiteAdminTransition
): string {
  if (t === 'activate' && rowStatus === 'archived') {
    return 'Unarchive (activate)'
  }
  switch (t) {
    case 'needs_changes':
      return 'Request changes'
    case 'approve':
      return 'Approve'
    case 'activate':
      return 'Activate'
    case 'archive':
      return 'Archive'
    default:
      return t
  }
}
