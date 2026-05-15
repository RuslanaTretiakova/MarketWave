import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { createClientOrNull } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export async function BottomCTA() {
  const supabase = await createClientOrNull()
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
  const isLoggedIn = Boolean(user)

  return (
    <section className="marketing-section-screen px-block py-layout sm:px-section bg-(--marketing-page-bg)">
      <div className="max-w-marketing mx-auto">
        <div className="mx-auto max-w-3xl lg:max-w-5xl">
          <div className="border-border/40 shadow-soft p-section sm:px-layout sm:py-section lg:px-hero lg:py-hero xl:px-hero-wide xl:py-hero-wide rounded-[28px] border bg-(--marketing-mint-panel) text-center lg:rounded-4xl">
            <p className="mb-block lg:mb-layout font-mono text-xs font-semibold tracking-wider text-(--marketing-teal-accent) uppercase lg:text-sm">
              / Welcome back
            </p>
            <h2 className="marketing-heading text-2xl font-semibold tracking-tight text-(--marketing-welcome-title) sm:text-3xl md:text-4xl lg:text-5xl lg:tracking-tight xl:text-6xl">
              Already part of the team?
            </h2>
            <p className="text-muted-foreground mt-layout lg:mt-layout mx-auto max-w-md font-sans text-sm leading-relaxed lg:max-w-2xl lg:text-lg lg:leading-relaxed">
              New team members join via invitation. Use Log in if you already have an account.
            </p>
            <Link
              href={isLoggedIn ? '/dashboard' : '/auth/login'}
              className={cn(
                buttonVariants({ variant: 'cta', size: 'lg' }),
                'marketing-lift-hover mt-layout lg:mt-layout inline-flex rounded-full bg-linear-to-r from-[#ff6b35] to-[#ff4d2d] px-10 font-sans text-base shadow-[0_12px_28px_rgb(255_107_53/0.35)] transition-shadow hover:shadow-[0_16px_36px_rgb(255_107_53/0.42)] lg:h-11 lg:min-w-44 lg:px-14 lg:text-lg lg:shadow-[0_16px_36px_rgb(255_107_53/0.38)] lg:hover:shadow-[0_20px_44px_rgb(255_107_53/0.45)] [&_svg]:size-4 lg:[&_svg]:size-5'
              )}
            >
              {isLoggedIn ? 'Go to dashboard' : 'Log in'}{' '}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
