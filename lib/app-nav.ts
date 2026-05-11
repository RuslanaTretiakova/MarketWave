import type { LucideIcon } from 'lucide-react'
import {
  ClipboardList,
  DollarSign,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  ShoppingCart,
  Tags,
  Users,
} from 'lucide-react'

import type { Database } from '@/lib/supabase/types'

export type AppNavItem = {
  href: string
  label: string
  Icon: LucideIcon
}

export type AppNavRole = Database['public']['Enums']['user_role']

const dashboard: AppNavItem = { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard }
const sites: AppNavItem = { href: '/sites', label: 'Site catalog', Icon: Globe }
const orders: AppNavItem = { href: '/orders', label: 'Orders', Icon: ClipboardList }
const invoices: AppNavItem = { href: '/invoices', label: 'Invoices', Icon: Receipt }
const cart: AppNavItem = { href: '/cart', label: 'Cart', Icon: ShoppingCart }
const users: AppNavItem = { href: '/settings/users', label: 'Users', Icon: Users }
const categories: AppNavItem = { href: '/settings/categories', label: 'Categories', Icon: Tags }
const chats: AppNavItem = { href: '/chats', label: 'Chats', Icon: MessageSquare }
const earnings: AppNavItem = { href: '/earnings', label: 'Earnings', Icon: DollarSign }

/** All items — kept for backwards-compat and active-state helpers. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  dashboard,
  sites,
  orders,
  invoices,
  cart,
  users,
  categories,
  chats,
  earnings,
]

/** Role-filtered nav items shown in the app sidebar. */
export function getAppNavItems(role: AppNavRole): AppNavItem[] {
  switch (role) {
    case 'client':
      return [dashboard, sites, cart, orders, invoices, chats]
    case 'admin':
      return [dashboard, users, categories, sites, orders, invoices, chats, earnings]
    case 'manager':
      return [dashboard, sites, orders, invoices, chats, earnings]
    case 'sourcer':
      return [dashboard, sites, chats, earnings]
    case 'copywriter':
      return [dashboard, orders, chats]
    default:
      return [dashboard, sites, orders]
  }
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
  if (pathname === '/settings/categories') return 'Categories'
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
