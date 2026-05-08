import type { Database } from '@/lib/supabase/types'

import type { SiteAdminTransition } from '@/lib/sites/site-actions'

type SiteStatus = Database['public']['Enums']['site_status']

/** Admin-only status actions available for a catalog row's current status. */
export function siteAdminTransitions(status: SiteStatus): SiteAdminTransition[] {
  switch (status) {
    case 'pending':
      return ['needs_changes', 'approve', 'archive']
    case 'needs_changes':
      return ['approve', 'archive']
    case 'active':
      return ['needs_changes', 'archive']
    case 'archived':
      return ['unarchive']
    default:
      return ['archive']
  }
}

export function siteAdminTransitionMenuLabel(t: SiteAdminTransition): string {
  switch (t) {
    case 'needs_changes':
      return 'Needs changes'
    case 'approve':
      return 'Approve'
    case 'archive':
      return 'Archive site'
    case 'unarchive':
      return 'Unarchive site'
    default:
      return t
  }
}
