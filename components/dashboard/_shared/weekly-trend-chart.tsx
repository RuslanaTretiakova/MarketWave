import { TrendingUp } from 'lucide-react'

export function WeeklyTrendChart({
  counts,
  emptyTitle = 'No activity in the last 12 weeks.',
  emptyHint,
}: {
  counts: number[]
  emptyTitle?: string
  emptyHint?: string
}) {
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div className="text-muted-foreground gap-inset bg-muted/30 px-block py-section flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
        <TrendingUp className="text-muted-foreground/50 size-8" aria-hidden />
        <p>{emptyTitle}</p>
        {emptyHint ? (
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">{emptyHint}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="px-inset pt-section flex min-h-36 items-end gap-1">
      {counts.map((n, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="bg-primary/85 mx-auto w-full max-w-[22px] rounded-t-sm"
            style={{ height: `${Math.max(8, (n / max) * 120)}px` }}
            title={`Week ${i + 1}: ${n}`}
          />
          {i === 0 || i === 5 || i === 11 ? (
            <span className="text-muted-foreground font-mono text-[0.65rem] tabular-nums">
              W{i + 1}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono text-[0.65rem] opacity-0">·</span>
          )}
        </div>
      ))}
    </div>
  )
}
