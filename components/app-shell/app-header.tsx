'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

import { AppNavLinks } from '@/components/app-shell/app-sidebar'
import { AppUserMenu } from '@/components/app-shell/app-user-menu'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { APP_NAV_ITEMS } from '@/lib/app-nav'
import { cn } from '@/lib/utils'

function titleForPath(pathname: string): string {
  const hit = APP_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  return hit?.label ?? 'Dashboard'
}

export function AppHeader({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="border-border bg-background/95 gap-block px-block md:px-layout sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b backdrop-blur-md">
      <div className="gap-block flex min-w-0 flex-1 items-center">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'md:hidden')}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton
            className="border-sidebar-border bg-sidebar text-sidebar-foreground w-72 gap-0 border-r p-0"
          >
            <SheetHeader className="border-sidebar-border px-block py-block border-b text-left">
              <SheetTitle className="text-sidebar-foreground font-heading text-base font-semibold">
                Navigate
              </SheetTitle>
            </SheetHeader>
            <div className="p-block">
              <AppNavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-foreground truncate text-lg font-semibold tracking-tight md:text-xl">
          {titleForPath(pathname)}
        </h1>
      </div>
      <AppUserMenu email={userEmail} />
    </header>
  )
}
