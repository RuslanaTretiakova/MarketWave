import type { LucideIcon } from 'lucide-react'
import { ClipboardList, Globe, LayoutDashboard, Settings, ShoppingCart } from 'lucide-react'

export type AppNavItem = {
  href: string
  label: string
  Icon: LucideIcon
}

/** Authenticated app shell navigation — mirrors typical MarketWeave / ops flows. */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/sites', label: 'Site catalog', Icon: Globe },
  { href: '/orders', label: 'Orders', Icon: ClipboardList },
  { href: '/cart', label: 'Cart', Icon: ShoppingCart },
  { href: '/settings', label: 'Settings', Icon: Settings },
]
