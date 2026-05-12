import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  /** Serif wordmark for footer (plan); nav stays sans. */
  serifWordmark?: boolean
  /** Icon mark only (e.g. collapsed sidebar). */
  compact?: boolean
}

export function Logo({ className, serifWordmark = false, compact = false }: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-(--accent-teal-strong)">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-4.5">
          <path
            d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact ? (
        <span
          className={cn(
            'text-foreground leading-none font-semibold tracking-tight',
            serifWordmark ? 'marketing-heading' : 'logo-wordmark font-sans'
          )}
        >
          Market<span className="text-primary">Weave</span>
        </span>
      ) : null}
    </div>
  )
}
