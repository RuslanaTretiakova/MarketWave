import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { HeroProductMockup } from '@/components/marketing/hero-product-mockup'
import { buttonVariants } from '@/components/ui/button'
import { createClientOrNull } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

const trust = ['Invitation-based access', 'Role-aware UI', 'Audit-ready history'] as const

/** Pill CTAs like the reference; `shrink-0` + `flex-nowrap` so flex parents with `min-w-0` don’t split label and icon. */
const heroButtonClass =
  'inline-flex h-12 min-h-12 shrink-0 flex-row flex-nowrap items-center justify-center gap-2 whitespace-nowrap rounded-full px-7 text-[0.9375rem] font-semibold sm:h-14 sm:min-h-14 sm:px-8 sm:text-base md:px-10 md:text-lg w-full sm:w-auto sm:min-w-[11.5rem] md:min-w-[13rem] [&_svg]:size-[1.125rem] md:[&_svg]:size-5 [&_svg]:shrink-0'

export async function LandingHero() {
  const supabase = await createClientOrNull()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  const isLoggedIn = Boolean(user)

  return (
    <section
      id="hero"
      className="px-block sm:px-section relative scroll-mt-(--marketing-nav-h) overflow-hidden bg-(--marketing-page-bg) py-20 md:py-28 lg:flex lg:min-h-[calc(100svh-var(--marketing-nav-h))] lg:flex-col lg:justify-center lg:py-10 xl:py-14"
    >
      <div className="grid-paper pointer-events-none absolute inset-0 opacity-[0.42]" aria-hidden />
      <div className="max-w-marketing relative mx-auto grid items-center gap-12 py-2 lg:grid-cols-12 lg:gap-14">
        <div className="text-left lg:col-span-7">
          <div className="border-primary/25 bg-primary-soft/70 text-primary-ink inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-xs font-medium tracking-tight">
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-hidden />
            Operations OS for link-building teams
          </div>

          <h1 className="font-display text-foreground mt-7 text-[2.125rem] leading-[1.06] font-semibold tracking-[-0.02em] sm:text-5xl sm:leading-[1.05] md:text-6xl md:leading-[1.04] lg:text-[3.35rem] lg:leading-[1.03] xl:text-7xl xl:leading-[1.02]">
            <span className="block">Weave every</span>
            <span className="block">
              <em className="text-primary not-italic">placement</em> into one
            </span>
            <span className="relative isolate mt-[0.02em] block">
              <span className="relative z-10">linear workflow.</span>
              <span
                className="bg-highlight/78 absolute inset-x-0 bottom-[0.08em] z-0 h-[0.42em] min-h-3 rounded-[3px] md:bottom-[0.06em] md:h-[0.38em] md:min-h-3.5"
                aria-hidden
              />
            </span>
          </h1>

          <p className="text-muted-foreground mt-7 max-w-xl font-sans text-lg leading-relaxed text-pretty md:text-xl">
            From order to invoice — sourcing, writing, approval and publishing live in one record.
            Fewer handoffs, fewer mistakes, one source of truth.
          </p>

          <div className="mt-10 flex w-full min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {isLoggedIn ? (
              <a
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: 'cta', size: 'xl' }),
                  heroButtonClass,
                  'shadow-accent overflow-hidden'
                )}
              >
                <span>Go to dashboard</span>
                <ArrowRight className="shrink-0" data-icon="inline-end" aria-hidden />
              </a>
            ) : (
              <a
                href="/auth/login"
                className={cn(
                  buttonVariants({ variant: 'cta', size: 'xl' }),
                  heroButtonClass,
                  'shadow-accent overflow-hidden'
                )}
              >
                <span>Log in</span>
                <ArrowRight className="shrink-0" data-icon="inline-end" aria-hidden />
              </a>
            )}
            <a
              href="#workflow"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'xl' }),
                heroButtonClass,
                'border-border/80 bg-background/90 text-foreground hover:bg-muted/50 overflow-hidden shadow-none transition-shadow duration-200 hover:shadow-sm sm:min-w-50'
              )}
            >
              See the workflow
            </a>
          </div>

          <ul className="text-muted-foreground mt-10 flex flex-wrap items-center gap-x-7 gap-y-2.5 font-sans text-sm leading-snug md:text-[0.9375rem]">
            {trust.map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <CheckCircle2 className="text-primary size-4 shrink-0 md:size-4.5" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative pt-10 lg:col-span-5 lg:pt-0">
          <HeroProductMockup />
        </div>
      </div>
    </section>
  )
}
