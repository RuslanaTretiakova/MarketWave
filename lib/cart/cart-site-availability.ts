import type { Database } from '@/lib/supabase/types'

export type SiteStatus = Database['public']['Enums']['site_status']

/** True when any cart line’s site is not orderable (must be Active to checkout). */
export function hasNonActiveSiteInCart(items: { site_status: SiteStatus }[]): boolean {
  return items.some((i) => i.site_status !== 'active')
}

/** User-facing copy for cart/checkout when checkout is blocked. */
export const CART_NON_ACTIVE_SITE_DISCLAIMER =
  'Orders can only be created for sites with status Active. If a site is pending, archived, or otherwise not Active, remove it from your cart or wait until it becomes Active again.'

export function inactiveSitesCheckoutErrorMessage(domains: string): string {
  return `${CART_NON_ACTIVE_SITE_DISCLAIMER} Not available: ${domains}.`
}

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  needs_changes: 'Needs changes',
  approved: 'Approved',
  archived: 'Archived',
}
