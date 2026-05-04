'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronsRight, Menu, PanelLeft } from 'lucide-react'

import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import { AppNavLinks } from '@/components/app-shell/app-sidebar'
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
  sidebarCollapsed,
  onToggleSidebarCollapsed,
}: {
  user: AppShellUser
  navItems: AppNavItem[]
  sidebarCollapsed: boolean
  onToggleSidebarCollapsed: () => void
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const pageTitle = navTitleForPath(pathname, navItems)
  const { first } = splitDisplayName(user.fullName, user.email)
  const firstName = first.trim() || 'there'

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
            className="border-sidebar-border bg-sidebar text-sidebar-foreground w-72 gap-0 border-r p-0 shadow-(--shadow-shell)"
          >
            <SheetHeader className="border-sidebar-border px-block py-block border-b text-left">
              <SheetTitle className="text-sidebar-foreground font-heading text-base font-semibold">
                {SITE_NAME}
              </SheetTitle>
            </SheetHeader>
            <div className="p-block">
              <AppNavLinks items={navItems} onNavigate={() => setMenuOpen(false)} />
            </div>
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
          {sidebarCollapsed ? (
            <ChevronsRight className="size-4" aria-hidden />
          ) : (
            <PanelLeft className="size-4" aria-hidden />
          )}
        </Button>
        <h1 className="text-foreground min-w-0 flex-1 leading-snug font-semibold tracking-tight">
          <span className="block truncate text-base md:text-lg">Welcome back, {firstName}</span>
          <span className="text-muted-foreground block truncate text-xs font-medium md:text-sm">
            {pageTitle}
          </span>
        </h1>
      </div>
      <AppUserMenu user={user} />
    </header>
  )
}
