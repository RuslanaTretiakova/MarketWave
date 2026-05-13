import { cn } from '@/lib/utils'

const PAYOUT_CHIP: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

export function PayoutStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        PAYOUT_CHIP[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {status}
    </span>
  )
}
