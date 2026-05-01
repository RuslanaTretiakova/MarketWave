'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { SiteBrandLink } from '@/components/layout/site-brand-link'
import { APP_NAV_ITEMS } from '@/lib/app-nav'
import { cn } from '@/lib/utils'

export function AppNavLinks({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className={cn('gap-inset flex flex-col', className)}>
      {APP_NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'gap-inset px-block py-inset flex items-center rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground'
            )}
          >
            <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'border-sidebar-border bg-sidebar text-sidebar-foreground flex w-full shrink-0 flex-col border-r shadow-(--shadow-shell) md:w-56',
        className
      )}
    >
      <div className="border-sidebar-border px-block py-block border-b">
        <SiteBrandLink
          href="/dashboard"
          logoClassName="[&_.logo-wordmark]:text-sidebar-foreground [&_span.text-primary]:text-sidebar-primary"
        />
      </div>
      <div className="p-block flex-1">
        <AppNavLinks />
      </div>
    </aside>
  )
}
