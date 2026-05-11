import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SettingsTablePagination({
  page,
  pageSize,
  totalCount,
  buildHref,
  className,
}: {
  page: number
  pageSize: number
  totalCount: number
  buildHref: (nextPage: number) => string
  className?: string
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const hasPrev = safePage > 1
  const hasNext = safePage < totalPages

  if (totalCount === 0) {
    return null
  }

  const navBtnClass = cn(
    buttonVariants({ variant: 'outline', size: 'sm' }),
    'inline-flex min-h-10 flex-1 justify-center sm:min-h-0 sm:flex-none'
  )

  return (
    <div
      className={cn(
        'border-border/60 text-muted-foreground px-section py-block gap-inset flex flex-col items-stretch border-t sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-center text-xs tabular-nums sm:text-left">
        Page {safePage} of {totalPages}
        <span className="text-muted-foreground/80 hidden sm:inline"> · </span>
        <span className="block sm:inline">{totalCount} total</span>
      </p>
      <div className="gap-inset flex w-full justify-center sm:w-auto sm:justify-end">
        {hasPrev ? (
          <Link href={buildHref(safePage - 1)} scroll={false} className={navBtnClass}>
            Previous
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 flex-1 sm:min-h-0 sm:flex-none"
            disabled
          >
            Previous
          </Button>
        )}
        {hasNext ? (
          <Link href={buildHref(safePage + 1)} scroll={false} className={navBtnClass}>
            Next
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 flex-1 sm:min-h-0 sm:flex-none"
            disabled
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
