'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'

import { SiteBrandLink } from '@/components/layout/site-brand-link'
import { Button } from '@/components/ui/button'
import { signOutAndRedirectToLogin } from '@/lib/auth/client-sign-out'
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
          'border-sidebar-border border-b p-3',
          isCollapsed ? 'flex justify-center' : 'flex justify-start'
        )}
      >
        <SiteBrandLink
          logoCompact={isCollapsed}
          className="min-w-0"
          logoClassName="[&_.logo-wordmark]:text-sidebar-foreground [&_span.text-primary]:text-sidebar-primary"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            isCollapsed ? 'py-block px-2' : 'p-block'
          )}
        >
          <AppNavLinks collapsed={isCollapsed} />
        </div>
        <div
          className={cn(
            'border-sidebar-border gap-block p-block flex flex-col border-t',
            isCollapsed && 'items-stretch px-2'
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size={isCollapsed ? 'icon-sm' : 'default'}
            className={cn(
              'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              !isCollapsed && 'h-9 w-full justify-start gap-2 px-3',
              'text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20'
            )}
            title={isCollapsed ? 'Log out' : undefined}
            onClick={() => void signOutAndRedirectToLogin()}
          >
            <LogOut className="size-4 shrink-0 opacity-90" aria-hidden />
            {!isCollapsed ? <span className="text-sm font-medium">Log out</span> : null}
          </Button>
          {onToggleCollapsed ? (
            <Button
              type="button"
              variant="ghost"
              size={isCollapsed ? 'icon-sm' : 'default'}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Narrow sidebar'}
              title={isCollapsed ? 'Expand sidebar' : undefined}
              onClick={onToggleCollapsed}
              className={cn(
                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                !isCollapsed && 'h-9 w-full justify-start gap-2 px-3'
              )}
            >
              {isCollapsed ? (
                <ChevronsRight className="size-4 shrink-0" aria-hidden />
              ) : (
                <>
                  <ChevronsLeft className="size-4 shrink-0 opacity-90" aria-hidden />
                  <span className="text-sidebar-foreground/90 text-sm font-medium">
                    Narrow sidebar
                  </span>
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
