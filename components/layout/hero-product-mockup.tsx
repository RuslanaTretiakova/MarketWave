function PipelineChip({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground font-sans text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase">
      {label}
    </span>
  )
}

function Connector() {
  return (
    <span className="bg-primary mx-inset inline-block h-px min-w-[12px] flex-1 rounded-full opacity-40" />
  )
}

export function HeroProductMockup() {
  const stages = ['Order', 'Assign', 'Write', 'Approve', 'Publish', 'Invoice'] as const

  return (
    <div className="relative mx-auto min-h-[440px] w-full max-w-xl lg:min-h-[500px]">
      {/* Floating detail */}
      <div className="border-border/80 shadow-soft motion-safe:animate-float absolute top-[6%] left-[4%] z-20 max-w-[200px] rounded-2xl border bg-(--marketing-card) motion-reduce:animate-none md:left-[8%]">
        <div className="gap-inset mb-inset px-block pb-block flex items-start justify-between pt-10">
          <div>
            <p className="text-foreground font-sans text-[11px] font-semibold">ORDER #1042</p>
            <p className="text-muted-foreground mt-inset font-sans text-[10px]">
              Guest post · DA 62
            </p>
            <p className="text-muted-foreground mt-inset font-sans text-[10px] leading-snug">
              Anchor: &quot;workflow software&quot;
            </p>
            <p className="text-primary mt-inset font-sans text-[10px] font-medium underline-offset-2">
              outreachhq.com
            </p>
          </div>
          <span className="px-inset rounded-md bg-(--marketing-yellow-underline) py-0.5 font-sans text-[9px] font-bold text-(--accent-teal-strong)">
            NEW
          </span>
        </div>
      </div>

      {/* Floating assignee */}
      <div className="border-border/80 p-block shadow-soft absolute right-[2%] bottom-[18%] z-20 max-w-[180px] rounded-2xl border bg-(--marketing-card) md:right-[6%]">
        <p className="text-muted-foreground mb-inset font-sans text-[9px] font-semibold tracking-wider uppercase">
          Assigned
        </p>
        <div className="gap-inset flex items-center">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-xs font-semibold">
            AM
          </span>
          <div>
            <p className="text-foreground font-sans text-xs font-semibold">A. Moreau</p>
            <p className="text-muted-foreground font-sans text-[10px]">Sourcer</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="border-border/70 mt-layout shadow-soft relative z-10 mx-auto max-w-[340px] rounded-[20px] border bg-(--marketing-card) sm:mt-0 sm:max-w-none md:mx-0">
        <div className="border-border/60 gap-y-inset px-section py-block flex flex-wrap items-center border-b">
          {stages.map((s, i) => (
            <div key={s} className="flex min-w-0 flex-1 items-center">
              <PipelineChip label={s} />
              {i < stages.length - 1 ? <Connector /> : null}
            </div>
          ))}
        </div>

        <div className="divide-border/60 px-section divide-y py-0 font-sans">
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1839</p>
              <p className="text-muted-foreground text-[11px]">Resource page · DA 71</p>
            </div>
            <span className="px-block py-inset rounded-full bg-(--accent-teal-strong) text-[10px] font-semibold text-white">
              IN PROGRESS
            </span>
          </div>
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1837</p>
              <p className="text-muted-foreground text-[11px]">Niche edit · DA 54</p>
            </div>
            <span className="px-block py-inset rounded-full bg-(--marketing-yellow-underline) text-[10px] font-semibold text-(--accent-teal-strong)">
              REVIEW
            </span>
          </div>
          <div className="gap-block py-block flex flex-wrap items-center justify-between">
            <div>
              <p className="text-foreground text-xs font-semibold">ORDER #1834</p>
              <p className="text-muted-foreground text-[11px]">Guest post · DA 68</p>
            </div>
            <span className="bg-muted px-block py-inset text-muted-foreground rounded-full text-[10px] font-semibold">
              PUBLISHED
            </span>
          </div>
        </div>

        <div className="bg-foreground text-background gap-inset px-section py-block flex flex-wrap items-center justify-between rounded-b-[18px]">
          <p className="font-sans text-[10px] font-semibold tracking-wide uppercase opacity-95">
            <span className="opacity-80">Invoice · April ·</span>{' '}
            <span className="text-background font-bold">$12,840</span>{' '}
            <span className="opacity-80">archived</span>
          </p>
          <span className="px-block py-inset bg-cta text-cta-foreground rounded-full text-[10px] font-bold shadow-sm">
            PAID
          </span>
        </div>
      </div>
    </div>
  )
}
