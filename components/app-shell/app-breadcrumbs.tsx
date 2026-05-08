'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { AppNavItem } from '@/lib/app-nav'
import { navTitleForPath } from '@/lib/app-nav'

type Crumb = {
  href: string
  label: string
}

function segmentLabel(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function inferLabel(pathname: string, segment: string, index: number): string {
  if (pathname.startsWith('/sites/')) {
    if (index === 1) return 'Site'
    if (index === 2 && segment === 'edit') return 'Edit'
  }

  if (pathname.startsWith('/orders/')) {
    if (index === 1) return 'Order'
  }

  if (pathname.startsWith('/settings/users/')) {
    if (index === 2) return 'User'
  }

  if (pathname === '/cart/checkout' && segment === 'checkout') {
    return 'Checkout'
  }

  return segmentLabel(segment)
}

function buildCrumbs(pathname: string, navItems: AppNavItem[]): Crumb[] {
  const cleanPath = pathname.split('?')[0] ?? pathname
  const segments = cleanPath.split('/').filter(Boolean)
  if (segments.length === 0) return []

  const crumbs: Crumb[] = []

  let runningPath = ''
  for (const [index, segment] of segments.entries()) {
    runningPath += `/${segment}`
    const label =
      index === 0 ? navTitleForPath(runningPath, navItems) : inferLabel(cleanPath, segment, index)
    crumbs.push({
      href: runningPath,
      label,
    })
  }

  return crumbs
}

export function AppBreadcrumbs({ navItems }: { navItems: AppNavItem[] }) {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname, navItems)
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-layout">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {isLast ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              )}
              {!isLast ? <span aria-hidden>/</span> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
