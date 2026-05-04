import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Globe, LayoutDashboard, ShoppingCart, Users } from 'lucide-react'

import type { Database } from '@/lib/supabase/types'

export type AppNavItem = {
  href: string
  label: string
  Icon: LucideIcon
}

export type AppNavRole = Database['public']['Enums']['user_role']

/** Authenticated app shell navigation — mirrors typical MarketWeave / ops flows. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/sites', label: 'Site catalog', Icon: Globe },
  { href: '/orders', label: 'Orders', Icon: ClipboardList },
  { href: '/cart', label: 'Cart', Icon: ShoppingCart },
]

/** Admin-only “Users” tab (longest-prefix match favors `/settings/users` over shorter routes). */
export function getAppNavItems(role: AppNavRole): AppNavItem[] {
  if (role !== 'admin') {
    return APP_NAV_ITEMS
  }
  return [
    APP_NAV_ITEMS[0],
    { href: '/settings/users', label: 'Users', Icon: Users },
    ...APP_NAV_ITEMS.slice(1),
  ]
}

/** Longest-prefix wins so `/settings/users` highlights Users. */
function matchingNavItem(pathname: string, items: AppNavItem[]): AppNavItem | undefined {
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length)
  return sorted.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
}

function settingsAreaTitle(pathname: string): string | undefined {
  if (pathname !== '/settings' && !pathname.startsWith('/settings/')) return undefined
  if (pathname === '/settings/profile') return 'Profile'
  if (pathname === '/settings/users' || pathname.startsWith('/settings/users/')) return 'Users'
  return 'Settings'
}

export function navTitleForPath(pathname: string, items: AppNavItem[]): string {
  const settingsTitle = settingsAreaTitle(pathname)
  if (settingsTitle !== undefined) return settingsTitle

  return matchingNavItem(pathname, items)?.label ?? 'Dashboard'
}

export function isAppNavItemActive(pathname: string, href: string, items: AppNavItem[]): boolean {
  return matchingNavItem(pathname, items)?.href === href
}
