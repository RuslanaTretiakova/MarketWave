import Link from 'next/link'

import { SiteBrandLink } from '@/components/layout/site-brand-link'
import { buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Built for ops', href: '#built-for-ops' },
  { label: 'Roles', href: '#roles' },
  { label: 'Access', href: '#access' },
] as const

export async function SiteNavbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-border/60 sticky top-0 z-50 border-b bg-[var(--marketing-page-bg)]/90 backdrop-blur-md">
      <div className="gap-block px-block sm:px-section mx-auto flex h-[60px] max-w-6xl items-center justify-between">
        <SiteBrandLink />
        <nav
          className="text-muted-foreground gap-layout absolute left-1/2 hidden -translate-x-1/2 text-sm font-medium md:flex"
          aria-label="Sections"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="gap-block flex shrink-0 items-center">
          <Link
            href="#access"
            className="text-muted-foreground hover:text-foreground marketing-lift-hover hidden text-sm font-medium transition-colors sm:inline"
          >
            Request access
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: 'cta', size: 'default' }),
                'marketing-lift-hover rounded-xl px-5 shadow-sm'
              )}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className={cn(
                buttonVariants({ variant: 'cta', size: 'default' }),
                'marketing-lift-hover rounded-xl px-5 shadow-sm'
              )}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
