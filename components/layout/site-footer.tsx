import Link from 'next/link'

import { Logo } from '@/components/layout/logo'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Workflow', href: '#workflow' },
  { label: 'Features', href: '#built-for-ops' },
  { label: 'Access', href: '#access' },
] as const

export function SiteFooter() {
  const y = new Date().getFullYear()
  return (
    <footer className="border-border/70 py-layout mt-auto border-t bg-(--marketing-page-bg)">
      <div className="gap-layout px-block sm:px-section mx-auto flex max-w-6xl flex-col sm:flex-row sm:items-center sm:justify-between">
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
              'marketing-lift-hover inline-flex font-semibold text-(--marketing-teal-deep)'
            )}
          >
            Log in →
          </Link>
        </nav>
      </div>
    </footer>
  )
}
