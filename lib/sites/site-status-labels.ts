import type { Database } from '@/lib/supabase/types'

export type SiteStatus = Database['public']['Enums']['site_status']

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  pending: 'Pending',
  needs_changes: 'Needs changes',
  active: 'Active',
  archived: 'Archived',
  // legacy enum values kept for type completeness — no longer used in workflow
  inactive: 'Inactive',
  approved: 'Approved',
}

export const SITE_STATUSES_ORDERED: SiteStatus[] = [
  'pending',
  'needs_changes',
  'active',
  'archived',
]
