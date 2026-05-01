import { Sparkles } from 'lucide-react'

const stages = [
  'Sourcing',
  'Outreach',
  'Briefs',
  'Drafts',
  'QA',
  'Approvals',
  'Anchor checks',
  'Publishing',
  'Invoicing',
] as const

export function WorkflowStageCluster() {
  return (
    <div className="gap-section flex shrink-0 items-center">
      <span className="text-muted-foreground font-sans text-[11px] font-semibold tracking-[0.2em] whitespace-nowrap uppercase">
        ONE RECORD · END-TO-END
      </span>
      {stages.map((label, i) => (
        <span key={label} className="gap-section flex shrink-0 items-center">
          <Sparkles className="text-primary size-3 shrink-0 opacity-80" aria-hidden />
          <span
            className={
              i === 0
                ? 'marketing-heading text-muted-foreground/50 text-sm whitespace-nowrap md:text-base'
                : 'marketing-heading text-foreground text-sm whitespace-nowrap md:text-base'
            }
          >
            {label}
          </span>
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
    <div className="border-border/50 border-y bg-[var(--marketing-page-bg)]">
      <div className="marketing-marquee-static-row">
        <WorkflowStageCluster />
      </div>

      <div className="marketing-marquee-animated-wrap relative">
        <div className="marketing-marquee-wrap relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--marketing-page-bg)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--marketing-page-bg)] to-transparent" />
          <div className="marketing-marquee-track flex items-center">
            <StripInner />
            <StripInner />
          </div>
        </div>
      </div>
    </div>
  )
}
