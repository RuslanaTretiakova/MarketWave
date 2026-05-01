import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

import { HeroProductMockup } from '@/components/layout/hero-product-mockup'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const trust = ['Invitation-based access', 'Role-aware UI', 'Audit-ready history'] as const

export function LandingHero() {
  return (
    <section
      id="hero"
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-[var(--marketing-nav-h)]"
    >
      <div className="gap-layout lg:gap-layout mx-auto grid max-w-6xl items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="max-w-xl lg:max-w-none">
          <div className="border-primary/25 bg-primary/12 mb-layout gap-inset px-block py-inset inline-flex items-center rounded-full border font-sans text-xs font-semibold tracking-wide text-[var(--marketing-teal-deep)]">
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
            Operations OS for link-building teams
          </div>

          <h1 className="marketing-heading text-foreground text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl md:text-[3.25rem]">
            Weave every <span className="text-[var(--marketing-teal-deep)]">placement</span> into
            one <span className="marketing-yellow-underline px-0.5">linear workflow.</span>
          </h1>

          <p className="text-muted-foreground mt-layout font-sans text-lg leading-relaxed">
            From order to invoice — sourcing, writing, approval and publishing live in one record.
            Fewer handoffs, fewer mistakes, one source of truth.
          </p>

          <div className="mt-layout gap-inset flex flex-wrap">
            <Link
              href="/auth/login"
              className={cn(
                buttonVariants({ variant: 'cta', size: 'lg' }),
                'marketing-lift-hover rounded-xl px-6 font-sans shadow-md'
              )}
            >
              Log in <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#workflow"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'marketing-lift-hover rounded-xl border-[var(--border)] bg-[var(--marketing-card)] px-6 font-sans'
              )}
            >
              See the workflow
            </Link>
          </div>

          <ul className="text-muted-foreground mt-layout gap-inset sm:gap-x-layout flex flex-col font-sans text-sm sm:flex-row sm:flex-wrap">
            {trust.map((t) => (
              <li
                key={t}
                className="gap-inset flex items-center text-[var(--marketing-teal-accent)]"
              >
                <Check className="size-4 shrink-0 text-[var(--primary)]" aria-hidden />
                <span className="text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <HeroProductMockup />
      </div>
    </section>
  )
}
