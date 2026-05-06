import { Crown, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = ['Step 01 — Admin', 'Step 02 — Configure', 'Step 03 — Invite'] as const

export function HowItWorks() {
  return (
    <section
      id="invites"
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-(--marketing-nav-h) bg-(--marketing-page-bg)"
    >
      <div className="gap-layout max-w-marketing mx-auto grid lg:grid-cols-2">
        {/* Light card */}
        <div className="border-border/70 p-section lg:p-layout shadow-soft flex flex-col rounded-[28px] border bg-(--marketing-card)">
          <div className="bg-primary/15 mb-layout gap-inset px-block py-inset inline-flex w-fit items-center rounded-full font-sans text-xs font-semibold text-(--accent-teal-strong)">
            <Crown className="size-4 shrink-0" aria-hidden />
            First admin
          </div>
          <h2 className="marketing-heading text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
            Bootstrap your organization once.
          </h2>
          <p className="text-muted-foreground mt-layout font-sans text-sm leading-relaxed">
            A single organization admin is created manually (Supabase Dashboard). That admin
            configures the workspace and invites everyone else by email.
          </p>
          <div className="mt-layout gap-inset flex flex-wrap">
            {steps.map((s) => (
              <span
                key={s}
                className="border-border text-muted-foreground px-block py-inset rounded-full border font-sans text-[10px] font-semibold tracking-wide uppercase"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Dark card */}
        <div className="marketing-grid-dark p-section lg:p-layout relative flex flex-col overflow-hidden rounded-[28px] bg-[#121417] text-white">
          <div className="mb-layout gap-inset px-block py-inset inline-flex w-fit items-center rounded-full bg-(--cta)/25 font-sans text-xs font-semibold text-[#ffb899]">
            <Mail className="size-4 shrink-0" aria-hidden />
            Everyone else
          </div>
          <h2 className="marketing-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Invitation only.
          </h2>
          <p className="mt-layout font-sans text-sm leading-relaxed text-[#b8c0c9]">
            After bootstrap, new users are created through email invitations with the right role —
            no open self-serve signup on the marketing site.
          </p>
          <div className="mt-layout p-block rounded-2xl border border-[#2a3138] bg-[#1a2028] font-sans">
            <div className="gap-block flex flex-wrap items-center justify-between">
              <div className="gap-block flex items-center">
                <span className="bg-cta text-cta-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                  M
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    Maria, you&apos;ve been invited to MarketWeave
                  </p>
                  <p className="mt-inset text-xs text-[#9ca8b8]">
                    Role: Copywriter · Expires in 7 days
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="cta"
                className="marketing-lift-hover px-block py-inset rounded-xl text-xs font-semibold shadow-md"
              >
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
