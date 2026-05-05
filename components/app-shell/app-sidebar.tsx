'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { SiteBrandLink } from '@/components/brand/site-brand-link'
import { Button } from '@/components/ui/button'
import { signOutAndRedirectToLogin } from '@/lib/auth/client-sign-out'
import type { AppNavItem } from '@/lib/app-nav'
import { isAppNavItemActive } from '@/lib/app-nav'
import { cn } from '@/lib/utils'

function SidebarLogoutFooter({ collapsed }: { collapsed: boolean }) {
  const isCollapsed = collapsed === true

  function handleLogoutClick() {
    void signOutAndRedirectToLogin()
  }

  return (
    <div
      className={cn(
        'border-sidebar-border gap-block pt-inset flex shrink-0 flex-col border-t',
        isCollapsed ? 'pb-inset px-2' : 'px-block pb-inset md:px-layout'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={isCollapsed ? 'icon-sm' : 'default'}
        className={cn(
          'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          !isCollapsed && 'h-9 w-full justify-start gap-2 px-0',
          'text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20'
        )}
        title={isCollapsed ? 'Log out' : undefined}
        onClick={handleLogoutClick}
      >
        <LogOut className="size-4 shrink-0 opacity-90" aria-hidden />
        {!isCollapsed ? <span className="text-sm font-medium">Log out</span> : null}
      </Button>
    </div>
  )
}

/** Nav + spacer + logout: no inner scroll; spacer fills height so logout sits at the bottom. */
export function AppSidebarNavPanel({
  className,
  collapsed,
  items,
  onNavigate,
}: {
  className?: string
  collapsed?: boolean
  items: AppNavItem[]
  onNavigate?: () => void
}) {
  const isCollapsed = collapsed === true
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div
        className={cn('shrink-0', isCollapsed ? 'py-inset px-2' : 'px-block py-inset md:px-layout')}
      >
        <AppNavLinks collapsed={isCollapsed} items={items} onNavigate={onNavigate} />
      </div>
      <div className="flex-1" aria-hidden />
      <SidebarLogoutFooter collapsed={isCollapsed} />
    </div>
  )
}

export function AppNavLinks({
  className,
  collapsed,
  items,
  onNavigate,
}: {
  className?: string
  collapsed?: boolean
  items: AppNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className={cn('gap-block flex flex-col', className)}>
      {items.map(({ href, label, Icon }) => {
        const active = isAppNavItemActive(pathname, href, items)
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            onClick={onNavigate}
            className={cn(
              'gap-block focus-visible:ring-sidebar-ring focus-visible:ring-offset-sidebar flex h-10 w-full items-center rounded-xl border font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              collapsed ? 'px-inset justify-center' : 'px-block',
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
  navItems,
}: {
  className?: string
  collapsed?: boolean
  navItems: AppNavItem[]
}) {
  const isCollapsed = collapsed === true

  return (
    <aside
      className={cn(
        'border-sidebar-border bg-sidebar text-sidebar-foreground flex shrink-0 flex-col overflow-hidden border-r shadow-(--shadow-shell) transition-[width] duration-200 ease-out',
        /* Viewport-high sticky rail: logout stays at bottom of visible panel while main scrolls. */
        'md:sticky md:top-0 md:h-dvh md:max-h-dvh md:self-start',
        isCollapsed ? 'md:w-19' : 'md:w-60',
        className
      )}
    >
      <div
        className={cn(
          'border-sidebar-border flex h-14 shrink-0 items-center border-b',
          isCollapsed ? 'justify-center px-2' : 'px-block md:px-layout justify-start'
        )}
      >
        <SiteBrandLink
          logoCompact={isCollapsed}
          className="min-w-0"
          logoClassName="[&_.logo-wordmark]:text-sidebar-foreground [&_span.text-primary]:text-sidebar-primary"
        />
      </div>
      <AppSidebarNavPanel collapsed={isCollapsed} items={navItems} />
    </aside>
  )
}
