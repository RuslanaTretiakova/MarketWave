import Link from 'next/link'

import { MarketingUserMenu } from '@/components/site/marketing-user-menu'
import { SiteBrandLink } from '@/components/brand/site-brand-link'
import { buttonVariants } from '@/components/ui/button'
import { createClientOrNull } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Built for ops', href: '#built-for-ops' },
  { label: 'Roles', href: '#roles' },
  { label: 'Invites', href: '#invites' },
] as const

export async function SiteNavbar() {
  const supabase = await createClientOrNull()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }

  const { data: profile } =
    user && supabase
      ? await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle()
      : { data: null }

  return (
    <header className="border-border/60 sticky top-0 z-50 border-b bg-(--marketing-page-bg)/90 backdrop-blur-md">
      <div className="gap-block px-block sm:px-section max-w-marketing mx-auto flex h-15 w-full items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] md:justify-center">
        <div className="flex min-w-0 items-center justify-start gap-3">
          <SiteBrandLink />
        </div>
        <nav
          className="text-muted-foreground gap-layout hidden min-w-0 items-center justify-center text-sm font-medium md:flex"
          aria-label="Sections"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-foreground shrink-0 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="gap-block flex w-max max-w-full shrink-0 items-center justify-end md:justify-self-end">
          {user ? (
            <MarketingUserMenu
              key={`${user.id}:${profile?.avatar_url ?? ''}`}
              email={user.email ?? ''}
              fullName={profile?.full_name ?? null}
              avatarUrl={profile?.avatar_url ?? null}
            />
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
