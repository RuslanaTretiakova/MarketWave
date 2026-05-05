import Link from 'next/link'

import { Logo } from '@/components/brand/logo'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Features', href: '#built-for-ops' },
  { label: 'Invites', href: '#invites' },
] as const

export function SiteFooter() {
  const y = new Date().getFullYear()
  return (
    <footer className="border-border/70 py-layout mt-auto border-t bg-(--marketing-page-bg)">
      <div className="gap-layout px-block sm:px-section max-w-marketing mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="gap-block flex flex-col">
          <Link href="/" className="inline-flex w-fit transition-opacity hover:opacity-90">
            <Logo serifWordmark />
          </Link>
          <p className="text-muted-foreground font-sans text-sm">
            © {y} {SITE_NAME}
          </p>
        </div>
        <nav className="text-muted-foreground gap-x-layout gap-y-block flex flex-wrap items-center font-sans text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
          <Link
            href="/auth/login"
            className={cn(
              'marketing-lift-hover inline-flex font-semibold text-(--accent-teal-strong)'
            )}
          >
            Log in →
          </Link>
        </nav>
      </div>
    </footer>
  )
}
