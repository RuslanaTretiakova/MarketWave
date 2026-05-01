import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BottomCTA() {
  return (
    <section className="marketing-section-screen px-block py-layout sm:px-section bg-[var(--marketing-page-bg)]">
      <div className="mx-auto max-w-3xl">
        <div
          className="border-border/40 px-section py-layout sm:px-layout sm:py-section rounded-[28px] border text-center"
          style={{
            backgroundColor: 'var(--marketing-mint-panel)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <p className="mb-block font-mono text-xs font-semibold tracking-wider text-[var(--marketing-teal-accent)] uppercase">
            / Welcome back
          </p>
          <h2 className="marketing-heading text-2xl font-semibold tracking-tight text-[var(--marketing-welcome-title)] sm:text-3xl md:text-4xl">
            Already part of the team?
          </h2>
          <p className="text-muted-foreground mt-layout mx-auto max-w-md font-sans text-sm leading-relaxed">
            New team members join via invitation. Use Log in if you already have an account.
          </p>
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: 'cta', size: 'lg' }),
              'marketing-lift-hover mt-layout inline-flex rounded-full bg-gradient-to-r from-[#ff6b35] to-[#ff4d2d] px-10 font-sans text-base shadow-[0_12px_28px_rgb(255_107_53_/_0.35)] transition-shadow hover:shadow-[0_16px_36px_rgb(255_107_53_/_0.42)]'
            )}
          >
            Log in <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
