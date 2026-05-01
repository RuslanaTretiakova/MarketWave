import type { ReactNode } from 'react'

import Link from 'next/link'

import { Logo } from '@/components/layout/logo'
import { SITE_TAGLINE } from '@/lib/brand'

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="border-sidebar-border bg-sidebar text-sidebar-foreground lg:p-section md:p-layout relative hidden flex-col justify-between overflow-hidden border-b shadow-(--shadow-shell) md:flex md:w-[42%] md:border-r md:border-b-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 120% 80% at 80% 20%, color-mix(in oklab, var(--sidebar-primary) 18%, transparent), transparent 55%)',
          }}
        />
        <div className="relative z-1">
          <Link href="/" className="inline-flex transition-opacity hover:opacity-90">
            <Logo className="[&_.logo-wordmark]:text-sidebar-foreground [&_span.text-primary]:text-sidebar-primary" />
          </Link>
          <p className="text-sidebar-foreground/90 mt-layout max-w-md text-base leading-relaxed">
            {SITE_TAGLINE}
          </p>
        </div>
        <p className="text-sidebar-foreground/65 relative z-1 text-sm">
          Operations OS for link-building teams — catalog, orders, approvals, and billing in one
          flow.
        </p>
      </div>
      <div className="px-block py-layout md:px-section lg:px-layout relative flex flex-1 flex-col justify-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 md:hidden"
          aria-hidden
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--primary) 10%, transparent), transparent 42%)',
          }}
        />
        {children}
      </div>
    </div>
  )
}
