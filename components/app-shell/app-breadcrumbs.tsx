'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { AppNavItem } from '@/lib/app-nav'
import { navTitleForPath } from '@/lib/app-nav'

type Crumb = {
  href: string
  label: string
}

/** Site detail + edit use `SiteDetailBreadcrumbs` in `sites/[siteId]/layout.tsx`. */
function isSiteDetailShellBreadcrumbPath(pathname: string): boolean {
  const p = pathname.split('?')[0] ?? pathname
  return /^\/sites\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/edit)?$/i.test(p)
}

function segmentLabel(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** UUID v4-style segment (avoid hyphen-split title case for IDs). */
function segmentLooksLikeOpaqueId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment.trim())
}

/** Human label for a dynamic route segment from its parent path segment. */
function labelForOpaqueId(parentSegment: string | undefined): string | null {
  switch (parentSegment) {
    case 'orders':
      return 'Order'
    case 'invoices':
      return 'Invoice'
    case 'sites':
      return 'Site'
    case 'chats':
      return 'Chat'
    case 'users':
      return 'User'
    default:
      return null
  }
}

function inferLabel(
  pathname: string,
  segment: string,
  index: number,
  allSegments: string[]
): string {
  if (pathname.startsWith('/sites/')) {
    if (index === 1 && segment === 'new') return 'Create site'
    if (index === 1) return 'Site'
    if (index === 2 && segment === 'edit') return 'Edit'
  }

  if (pathname.startsWith('/orders/')) {
    if (index === 1) return 'Order'
  }

  if (pathname.startsWith('/invoices/')) {
    if (index === 1) return 'Invoice'
  }

  if (pathname.startsWith('/chats/')) {
    if (index === 1) return 'Chat'
  }

  if (pathname.startsWith('/settings/users/')) {
    if (index === 2) return 'User'
  }

  if (pathname === '/cart/checkout' && segment === 'checkout') {
    return 'Checkout'
  }

  if (segmentLooksLikeOpaqueId(segment)) {
    const parent = index > 0 ? allSegments[index - 1] : undefined
    const fromParent = labelForOpaqueId(parent)
    if (fromParent) return fromParent
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
      index === 0
        ? navTitleForPath(runningPath, navItems)
        : inferLabel(cleanPath, segment, index, segments)
    crumbs.push({
      href: runningPath,
      label,
    })
  }

  return crumbs
}

export function AppBreadcrumbs({ navItems }: { navItems: AppNavItem[] }) {
  const pathname = usePathname()
  if (isSiteDetailShellBreadcrumbPath(pathname)) return null

  const crumbs = buildCrumbs(pathname, navItems)
  if (crumbs.length === 0) return null
  // Top-level routes (e.g. /dashboard, /orders) duplicate the sidebar; show crumbs only when nested.
  if (crumbs.length < 2) return null

  return (
    <Breadcrumb className="mb-layout">
      <BreadcrumbList className="text-xs">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem key={crumb.href}>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator key={`${crumb.href}-separator`} />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
