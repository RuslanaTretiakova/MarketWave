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

/** Tailwind classes for status pills (catalog, dashboard, etc.) */
export const SITE_STATUS_CHIP: Record<SiteStatus, string> = {
  pending: 'bg-amber-500/12 text-amber-900 dark:text-amber-100',
  needs_changes: 'bg-rose-500/12 text-rose-900 dark:text-rose-100',
  active: 'bg-emerald-500/12 text-emerald-900 dark:text-emerald-100',
  archived: 'bg-muted text-muted-foreground',
  // legacy enum values — no longer used in workflow
  approved: 'bg-sky-500/12 text-sky-900 dark:text-sky-100',
  inactive: 'bg-muted text-muted-foreground',
}
