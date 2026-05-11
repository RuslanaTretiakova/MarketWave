import { Link2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const stages = ['Order', 'Assign', 'Write', 'Approve', 'Publish', 'Invoice'] as const

const pipelineRows = [
  { id: '1039', title: 'Resource page · DA 71', stage: 'In progress', tone: 'primary' as const },
  { id: '1037', title: 'Niche edit · DA 54', stage: 'Review', tone: 'highlight' as const },
  { id: '1034', title: 'Guest post · DA 68', stage: 'Published', tone: 'muted' as const },
]

export function HeroProductMockup() {
  return (
    <div className="relative mx-auto max-w-md">
      {/* Floating order card */}
      <div className="border-border bg-card shadow-card animate-float pointer-events-auto absolute -top-8 -left-6 z-10 hidden w-56 rounded-2xl border p-4 md:block">
        <div className="flex items-center justify-between">
          <span className="font-mono-ui text-muted-foreground text-[10px] tracking-wider uppercase">
            Order #1042
          </span>
          <span className="font-mono-ui bg-highlight/60 text-highlight-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold">
            NEW
          </span>
        </div>
        <p className="font-display mt-2 text-lg leading-tight font-semibold">Guest post · DA 62</p>
        <p className="text-muted-foreground mt-1 text-xs">Anchor: &quot;workflow software&quot;</p>
        <div className="text-primary mt-3 flex items-center gap-2 text-xs">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          outreachhq.com
        </div>
      </div>

      {/* Main panel */}
      <div className="border-border bg-card shadow-card relative overflow-hidden rounded-3xl border">
        <div className="border-border bg-muted/60 flex items-center gap-1.5 border-b px-4 py-3">
          <span className="bg-foreground/15 h-2.5 w-2.5 rounded-full" aria-hidden />
          <span className="bg-foreground/15 h-2.5 w-2.5 rounded-full" aria-hidden />
          <span className="bg-foreground/15 h-2.5 w-2.5 rounded-full" aria-hidden />
          <span className="font-mono-ui text-muted-foreground ml-3 text-[11px] tracking-wider uppercase">
            marketweave / pipeline
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="font-mono-ui text-muted-foreground text-[10px] tracking-wider uppercase">
              Pipeline
            </p>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {stages.map((s, i) => (
                <div key={s} className="space-y-1.5">
                  <div
                    className={cn('h-1.5 rounded-full', i < 4 ? 'bg-primary' : 'bg-border')}
                    style={{ opacity: i < 4 ? 1 - i * 0.12 : 1 }}
                    aria-hidden
                  />
                  <div className="text-muted-foreground text-[10px]">{s}</div>
                </div>
              ))}
            </div>
          </div>

          {pipelineRows.map((r) => (
            <div
              key={r.id}
              className="border-border/80 bg-background/60 flex items-center justify-between rounded-xl border p-3"
            >
              <div>
                <p className="font-mono-ui text-muted-foreground text-[10px] uppercase">
                  Order #{r.id}
                </p>
                <p className="text-foreground text-sm font-medium">{r.title}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase',
                  r.tone === 'primary' && 'bg-primary-soft text-primary-ink',
                  r.tone === 'highlight' && 'bg-highlight/60 text-highlight-foreground',
                  r.tone === 'muted' && 'bg-muted text-muted-foreground'
                )}
              >
                {r.stage}
              </span>
            </div>
          ))}

          <div className="bg-foreground text-background flex items-center justify-between rounded-xl p-3">
            <div>
              <p className="font-mono-ui text-[10px] tracking-wider uppercase opacity-60">
                Invoice <span aria-hidden>·</span> April
              </p>
              <p className="font-display text-lg font-semibold">
                <span className="font-bold tabular-nums">$12,840</span> archived
              </p>
            </div>
            <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase">
              PAID
            </span>
          </div>
        </div>
      </div>

      {/* Floating role chip */}
      <div className="border-border bg-card shadow-card pointer-events-auto absolute -right-4 -bottom-6 hidden rotate-3 rounded-2xl border p-3 md:block">
        <p className="font-mono-ui text-muted-foreground text-[10px] tracking-wider uppercase">
          Assigned
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold">
            AM
          </span>
          <span className="text-sm font-medium">A. Moreau · Sourcer</span>
        </div>
      </div>
    </div>
  )
}
