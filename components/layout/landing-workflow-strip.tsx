import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Matches hero mock: ops stages after ONE RECORD / END-TO-END; serif emphasis mid-strip. */
const stripParts = [
  { label: 'ONE RECORD', variant: 'caps' as const },
  { label: 'END-TO-END', variant: 'caps' as const },
  { label: 'Drafts', variant: 'sans' as const },
  { label: 'QA', variant: 'sans' as const },
  { label: 'Approvals', variant: 'serif' as const },
  { label: 'Anchor checks', variant: 'serif' as const },
  { label: 'Publishing', variant: 'serif' as const },
  { label: 'Invoices', variant: 'serif' as const },
] as const

function StripSegment({ label, variant }: { label: string; variant: 'caps' | 'sans' | 'serif' }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        variant === 'caps' &&
          'text-muted-foreground font-sans text-[11px] font-semibold tracking-[0.2em] uppercase',
        variant === 'sans' &&
          'marketing-heading text-muted-foreground/80 text-sm md:text-(--marketing-button-text)',
        variant === 'serif' &&
          'font-display text-foreground text-base font-semibold tracking-tight md:text-lg'
      )}
    >
      {label}
    </span>
  )
}

export function WorkflowStageCluster() {
  return (
    <div className="gap-section flex shrink-0 items-center">
      {stripParts.map((part, i) => (
        <span key={part.label} className="gap-section flex shrink-0 items-center">
          {i > 0 ? (
            <Sparkles className="text-primary size-3.5 shrink-0 opacity-85" aria-hidden />
          ) : null}
          <StripSegment label={part.label} variant={part.variant} />
        </span>
      ))}
    </div>
  )
}

function StripInner() {
  return (
    <div className="gap-section px-section py-block flex shrink-0 items-center">
      <WorkflowStageCluster />
    </div>
  )
}

export function LandingWorkflowStrip() {
  return (
    <div className="border-border/40 border-y bg-(--marketing-page-bg)">
      <div className="marketing-marquee-static-row">
        <WorkflowStageCluster />
      </div>

      <div className="marketing-marquee-animated-wrap relative">
        <div className="marketing-marquee-wrap relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-(--marketing-page-bg) to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-(--marketing-page-bg) to-transparent" />
          <div className="marketing-marquee-track flex items-center">
            <StripInner />
            <StripInner />
          </div>
        </div>
      </div>
    </div>
  )
}
