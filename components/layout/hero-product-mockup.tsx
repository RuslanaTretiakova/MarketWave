import { Link2 } from 'lucide-react'

import { cn } from '@/lib/utils'

function PipelineChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'text-muted-foreground font-sans text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase',
        className
      )}
    >
      {label}
    </span>
  )
}

/** Floated over the main dashboard card; must render inside the card’s `relative` container. */
function HeroFloatingOrderCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border-border/80 shadow-soft motion-safe:animate-hero-order-float-top gap-inset px-block pb-block pointer-events-auto absolute top-[-100px] left-[-30px] z-40 flex w-[min(100%,13.75rem)] max-w-[220px] items-start justify-between rounded-2xl border bg-(--marketing-card) pt-6 motion-reduce:animate-none',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-foreground font-sans text-[11px] font-semibold tracking-wide">
          ORDER #1042
        </p>
        <p className="font-display text-foreground mt-inset text-sm leading-snug font-semibold tracking-tight">
          Guest post · DA 62
        </p>
        <p className="text-muted-foreground mt-inset font-sans text-[10px] leading-snug">
          Anchor: &quot;workflow software&quot;
        </p>
        <p className="text-primary mt-inset inline-flex items-center gap-1 font-sans text-[10px] font-medium underline-offset-2">
          <Link2 className="size-2.5 shrink-0 opacity-90" aria-hidden />
          outreachhq.com
        </p>
      </div>
      <span className="px-inset shrink-0 rounded-md bg-(--marketing-yellow-underline) py-0.5 font-sans text-[9px] font-bold text-(--accent-teal-strong)">
        NEW
      </span>
    </div>
  )
}

export function HeroProductMockup() {
  const stages = ['Order', 'Assign', 'Write', 'Approve', 'Publish', 'Invoice'] as const

  return (
    <div className="relative z-10 col-start-1 row-start-2 mx-auto min-h-[440px] w-full max-w-xl overflow-visible lg:col-start-2 lg:row-start-1 lg:min-h-[500px]">
      {/* Main card */}
      <div className="border-border/70 mt-layout shadow-soft relative z-10 mx-auto max-w-[340px] overflow-visible rounded-[20px] border bg-(--marketing-card) sm:mt-0 sm:max-w-none md:mx-0">
        <HeroFloatingOrderCard />
        <div className="border-border/50 bg-muted/25 px-section py-inset border-b">
          <p className="text-muted-foreground font-sans text-[10px] font-semibold tracking-[0.14em] uppercase">
            TIMELINE
          </p>
        </div>
        <div className="border-border/60 gap-x-block px-section py-section flex border-b">
          {stages.map((s, i) => (
            <div key={s} className="gap-block flex min-w-0 flex-1 flex-col items-stretch">
              <div
                className={cn(
                  'h-1 w-full shrink-0 rounded-full',
                  i < 3 ? 'bg-(--accent-teal-strong)' : 'bg-muted-foreground/20'
                )}
                aria-hidden
              />
              <PipelineChip label={s} className="block text-center" />
            </div>
          ))}
        </div>

        <div className="divide-border/60 px-section divide-y py-0 font-sans">
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1039</p>
              <p className="text-muted-foreground text-[11px]">Resource page · DA 71</p>
            </div>
            <span className="px-block py-inset rounded-full bg-(--accent-teal-strong) text-[10px] font-semibold text-white">
              IN PROGRESS
            </span>
          </div>
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1037</p>
              <p className="text-muted-foreground text-[11px]">Niche edit · DA 54</p>
            </div>
            <span className="px-block py-inset rounded-full bg-(--marketing-yellow-underline) text-[10px] font-semibold text-(--accent-teal-strong)">
              REVIEW
            </span>
          </div>
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1034</p>
              <p className="text-muted-foreground text-[11px]">Guest post · DA 68</p>
            </div>
            <span className="bg-muted px-block py-inset text-muted-foreground rounded-full text-[10px] font-semibold">
              PUBLISHED
            </span>
          </div>
        </div>

        <div className="bg-foreground text-background gap-block px-section py-block flex flex-wrap items-end justify-between rounded-b-[18px]">
          <div className="min-w-0">
            <p className="font-sans text-[10px] font-semibold tracking-wide text-white/55 uppercase">
              Invoice <span aria-hidden>•</span> April
            </p>
            <p className="font-display mt-inset text-lg leading-tight font-semibold tracking-tight text-white md:text-xl">
              <span className="font-bold tabular-nums">$12,840</span>{' '}
              <span className="text-lg font-medium text-white/70 md:text-xl">archived</span>
            </p>
          </div>
          <span className="px-block py-inset bg-cta text-cta-foreground shrink-0 rounded-full text-[10px] font-bold shadow-sm">
            PAID
          </span>
        </div>
      </div>

      <div className="border-border/80 text-foreground p-block shadow-soft pointer-events-auto absolute right-[2%] bottom-[-10%] z-20 w-[180px] max-w-[180px] rounded-2xl border bg-(--marketing-card) md:right-[6%]">
        <p className="text-muted-foreground mb-inset font-sans text-[9px] font-semibold tracking-wider uppercase">
          Assigned
        </p>
        <div className="gap-inset flex items-center">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold">
            AM
          </span>
          <p className="text-foreground font-sans text-xs leading-snug font-semibold">
            A. Moreau{' '}
            <span className="text-muted-foreground font-normal" aria-hidden>
              •
            </span>{' '}
            Sourcer
          </p>
        </div>
      </div>
    </div>
  )
}
