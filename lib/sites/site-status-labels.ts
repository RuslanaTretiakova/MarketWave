import type { Database } from '@/lib/supabase/types'

export type SiteStatus = Database['public']['Enums']['site_status']

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  approved: 'Approved',
  inactive: 'Inactive',
  needs_changes: 'Needs changes',
  pending_review: 'Pending',
}

export const SITE_STATUSES_ORDERED: SiteStatus[] = [
  'pending_review',
  'needs_changes',
  'approved',
  'active',
  'inactive',
  'archived',
]
