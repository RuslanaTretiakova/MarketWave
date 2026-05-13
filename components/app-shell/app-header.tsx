'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, PanelLeft, ShoppingCart } from 'lucide-react'

import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import { AppSidebarNavPanel } from '@/components/app-shell/app-sidebar'
import { AppUserMenu } from '@/components/app-shell/app-user-menu'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { AppNavItem } from '@/lib/app-nav'
import { navTitleForPath } from '@/lib/app-nav'
import { SITE_NAME } from '@/lib/brand'
import { splitDisplayName } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

export function AppHeader({
  user,
  navItems,
  navBadges,
  notificationsUnreadCount = 0,
  cartItemCount = 0,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
}: {
  user: AppShellUser
  navItems: AppNavItem[]
  navBadges?: Record<string, number>
  notificationsUnreadCount?: number
  cartItemCount?: number
  sidebarCollapsed: boolean
  onToggleSidebarCollapsed: () => void
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const pageTitle = navTitleForPath(pathname, navItems)
  const { first } = splitDisplayName(user.fullName, user.email)
  const firstName = first.trim() || 'there'
  const onNotificationsPage =
    pathname === '/notifications' || pathname.startsWith('/notifications/')
  const onCartPage = pathname === '/cart' || pathname.startsWith('/cart/')
  const showCart = user.role === 'client'

  return (
    <header className="border-border bg-app-shell-canvas/95 gap-block px-block md:px-layout sticky top-0 z-40 flex min-h-14 shrink-0 items-center justify-between border-b py-2 backdrop-blur-md md:h-14 md:min-h-0 md:py-0">
      <div className="gap-block flex min-w-0 flex-1 items-center">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            type="button"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded-lg md:hidden'
            )}
            aria-label="Open navigation"
          >
            <Menu className="size-4" aria-hidden />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton
            className="border-sidebar-border bg-sidebar text-sidebar-foreground flex h-full w-72 flex-col gap-0 border-r p-0 shadow-(--shadow-shell)"
          >
            <SheetHeader className="border-sidebar-border px-block py-block shrink-0 border-b text-left">
              <SheetTitle className="text-sidebar-foreground font-heading text-base font-semibold">
                {SITE_NAME}
              </SheetTitle>
            </SheetHeader>
            <AppSidebarNavPanel
              className="min-h-0"
              collapsed={false}
              items={navItems}
              navBadges={navBadges}
              onNavigate={() => setMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground hidden shrink-0 rounded-lg md:inline-flex'
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          onClick={onToggleSidebarCollapsed}
        >
          <PanelLeft className="size-4" aria-hidden />
        </Button>
        <h1 className="text-foreground min-w-0 flex-1 leading-snug font-semibold tracking-tight">
          <span className="block truncate text-base md:text-lg">Welcome back, {firstName}</span>
          <span className="text-muted-foreground block truncate text-xs font-medium md:text-sm">
            {pageTitle}
          </span>
        </h1>
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 rounded-full border-0 bg-transparent px-0 py-0 shadow-none'
        )}
      >
        {showCart ? (
          <Link
            href="/cart"
            className={cn(
              'relative inline-flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full transition-colors outline-none',
              'text-foreground hover:bg-muted/80',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
              onCartPage && 'bg-muted/70 text-foreground'
            )}
            aria-label={cartItemCount > 0 ? `Cart, ${cartItemCount} items` : 'Cart'}
          >
            <ShoppingCart className="size-4.5 stroke-[1.75]" aria-hidden />
            {cartItemCount > 0 ? (
              <span
                className="bg-destructive text-destructive-foreground ring-background absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-[0.625rem] leading-none font-bold ring-2"
                aria-hidden
              >
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        <Link
          href="/notifications"
          className={cn(
            'relative inline-flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full transition-colors outline-none',
            'text-foreground hover:bg-muted/80',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2',
            onNotificationsPage && 'bg-muted/70 text-foreground'
          )}
          aria-label={
            notificationsUnreadCount > 0
              ? `Notifications, ${notificationsUnreadCount} unread`
              : 'Notifications'
          }
        >
          <Bell className="size-4.5 stroke-[1.75]" aria-hidden />
          {notificationsUnreadCount > 0 ? (
            <span
              className="bg-destructive text-destructive-foreground ring-background absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-[0.625rem] leading-none font-bold ring-2"
              aria-hidden
            >
              {notificationsUnreadCount > 9 ? '9+' : notificationsUnreadCount}
            </span>
          ) : null}
        </Link>
        <AppUserMenu key={`${user.id}:${user.avatarUrl ?? ''}`} user={user} />
      </div>
    </header>
  )
}
