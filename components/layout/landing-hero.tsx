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
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-(--marketing-nav-h) bg-(--marketing-page-bg)"
    >
      <div className="gap-layout lg:gap-layout mx-auto grid max-w-6xl items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="max-w-xl lg:max-w-none">
          <div className="border-primary/30 bg-primary/8 mb-layout gap-inset px-block py-inset inline-flex items-center rounded-full border font-sans text-xs font-semibold tracking-wide text-(--marketing-teal-deep)">
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
            Operations OS for link-building teams
          </div>

          <h1 className="font-display text-foreground text-4xl leading-[1.06] font-semibold tracking-tight sm:text-5xl md:text-[3.35rem]">
            Weave every <span className="text-(--marketing-teal-deep)">placement</span> into one{' '}
            <span className="marketing-yellow-underline px-0.5">linear workflow.</span>
          </h1>

          <p className="text-muted-foreground mt-layout max-w-[42ch] font-sans text-lg leading-relaxed md:text-[1.0625rem]">
            From order to invoice — sourcing, writing, approval and publishing live in one record.
            Fewer handoffs, fewer mistakes, and a single source of truth your whole team — and
            clients — can trust.
          </p>

          <div className="mt-layout gap-inset flex flex-wrap">
            <Link
              href="/auth/login"
              className={cn(
                buttonVariants({ variant: 'cta', size: 'lg' }),
                'marketing-lift-hover shadow-accent rounded-2xl px-7 font-sans text-[0.9375rem] font-semibold'
              )}
            >
              Log in <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#workflow"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'marketing-lift-hover border-border/70 bg-card/90 shadow-soft rounded-2xl px-7 font-sans text-[0.9375rem] backdrop-blur-sm'
              )}
            >
              See the workflow
            </Link>
          </div>

          <ul className="text-muted-foreground mt-layout gap-block sm:gap-x-layout flex flex-col font-sans text-sm sm:flex-row sm:flex-wrap">
            {trust.map((t) => (
              <li key={t} className="gap-inset flex items-center">
                <Check className="text-primary size-4.5 shrink-0 stroke-[2.5]" aria-hidden />
                <span className="text-foreground/88">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <HeroProductMockup />
      </div>
    </section>
  )
}
