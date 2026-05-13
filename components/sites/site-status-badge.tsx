import {
  SITE_STATUS_CHIP,
  SITE_STATUS_LABEL,
  type SiteStatus,
} from '@/lib/sites/site-status-labels'
import { cn } from '@/lib/utils'

export function SiteStatusBadge({ status, className }: { status: SiteStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        SITE_STATUS_CHIP[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {SITE_STATUS_LABEL[status]}
    </span>
  )
}
