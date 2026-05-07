'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  dismissChangeRequest,
  resolveChangeRequest,
} from '@/lib/orders/resolve-change-request-action'
import type { OrderChangeRequest, UserRole } from '@/lib/orders/load-order-detail'
import { cn } from '@/lib/utils'

const STATUS_CHIP: Record<string, string> = {
  open: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  dismissed: 'bg-muted text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

export function ChangeRequestsList({
  changeRequests,
  role,
}: {
  changeRequests: OrderChangeRequest[]
  role: UserRole
}) {
  const [pending, startTransition] = useTransition()
  const isStaff = role === 'admin' || role === 'manager'

  function handleResolve(id: string) {
    startTransition(async () => {
      const res = await resolveChangeRequest(id)
      if (!res.ok) toast.error(res.message)
      else toast.success('Change request resolved.')
    })
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      const res = await dismissChangeRequest(id)
      if (!res.ok) toast.error(res.message)
      else toast.success('Change request dismissed.')
    })
  }

  if (changeRequests.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">No change requests for this order.</p>
    )
  }

  return (
    <div className="space-y-block">
      {changeRequests.map((cr) => (
        <div key={cr.id} className="border-border p-section space-y-block rounded-lg border">
          <div className="gap-block flex items-start justify-between">
            <p className="text-foreground text-sm leading-relaxed">{cr.comment}</p>
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                STATUS_CHIP[cr.status] ?? 'bg-muted text-muted-foreground'
              )}
            >
              {STATUS_LABEL[cr.status] ?? cr.status}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {new Date(cr.created_at).toLocaleString()}
          </p>
          {isStaff && cr.status === 'open' && (
            <div className="gap-inset flex">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleResolve(cr.id)}
                disabled={pending}
              >
                Resolve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(cr.id)}
                disabled={pending}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
