'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import { SiteBrandLink } from '@/components/layout/site-brand-link'
import { Button } from '@/components/ui/button'
import { APP_NAV_ITEMS } from '@/lib/app-nav'
import { cn } from '@/lib/utils'

export function AppNavLinks({
  className,
  collapsed,
  onNavigate,
}: {
  className?: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className={cn('gap-block flex flex-col', className)}>
      {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
            className={cn(
              'gap-block focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar flex items-center rounded-xl border font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5',
              active
                ? 'border-sidebar-border bg-sidebar-item-active text-sidebar-accent-foreground shadow-sm'
                : 'text-sidebar-foreground/85 hover:border-sidebar-border/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-transparent'
            )}
          >
            <Icon className="size-6 shrink-0 opacity-95" aria-hidden />
            <span className={cn('text-sm', collapsed ? 'sr-only' : '')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function AppSidebar({
  className,
  collapsed,
  onToggleCollapsed,
}: {
  className?: string
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const isCollapsed = collapsed === true

  return (
    <aside
      className={cn(
        'border-sidebar-border bg-sidebar text-sidebar-foreground flex shrink-0 flex-col overflow-hidden border-r shadow-(--shadow-shell) transition-[width] duration-200 ease-out',
        isCollapsed ? 'md:w-19' : 'md:w-60',
        className
      )}
    >
      <div
        className={cn(
          'border-sidebar-border gap-block border-b p-3',
          isCollapsed ? 'flex flex-col items-center' : 'flex items-center justify-between gap-2'
        )}
      >
        <SiteBrandLink
          href="/dashboard"
          logoCompact={isCollapsed}
          className={cn('min-w-0', isCollapsed ? 'justify-center' : 'flex-1')}
          logoClassName="[&_.logo-wordmark]:text-sidebar-foreground [&_span.text-primary]:text-sidebar-primary"
        />
        {onToggleCollapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapsed}
            className="text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0"
          >
            {isCollapsed ? (
              <ChevronsRight className="size-5" aria-hidden />
            ) : (
              <ChevronsLeft className="size-5" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>
      <div className={cn('flex-1', isCollapsed ? 'py-block px-2' : 'p-block')}>
        <AppNavLinks collapsed={isCollapsed} />
      </div>
    </aside>
  )
}
