import Link from 'next/link'
import { ArrowUpRight, Bell } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NotificationEvent, UnreadByEvent } from '@/lib/notifications/load-notifications'

const EVENT_LABELS: Record<NotificationEvent, string> = {
  order_created: 'New orders',
  copywriter_assigned: 'New assignments',
  copywriter_reassigned: 'Reassignments',
  content_submitted: 'Content submitted',
  changes_requested: 'Changes requested',
  content_approved: 'Content approved',
  order_published: 'Orders published',
  invoice_paid: 'Invoices paid',
  invoice_sent: 'Invoices sent',
  site_needs_changes: 'Site changes needed',
  site_approved: 'Sites approved',
  site_archived: 'Sites archived',
  site_unarchived: 'Sites activated',
}

const EVENT_TONE: Record<NotificationEvent, string> = {
  order_created: 'bg-primary-soft text-primary-ink',
  copywriter_assigned: 'bg-primary-soft text-primary-ink',
  copywriter_reassigned: 'bg-primary-soft/80 text-primary-ink',
  content_submitted: 'bg-primary-soft text-primary-ink',
  changes_requested: 'bg-accent-soft text-accent',
  content_approved: 'bg-primary-soft text-primary-ink',
  order_published: 'bg-muted text-muted-foreground',
  invoice_paid: 'bg-muted text-muted-foreground',
  invoice_sent: 'bg-blue-100 text-blue-800',
  site_needs_changes: 'bg-accent-soft text-accent',
  site_approved: 'bg-primary-soft text-primary-ink',
  site_archived: 'bg-muted text-muted-foreground',
  site_unarchived: 'bg-primary-soft/80 text-primary-ink',
}

export function NotificationsSummaryCard({ counts }: { counts: UnreadByEvent }) {
  const entries = (Object.entries(counts) as [NotificationEvent, number][]).filter(([, n]) => n > 0)
  if (entries.length === 0) return null

  const total = entries.reduce((sum, [, n]) => sum + n, 0)

  return (
    <Card className="border-border rounded-2xl shadow-none">
      <CardHeader className="gap-inset border-border border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-destructive/10 text-destructive inline-flex size-8 items-center justify-center rounded-lg">
              <Bell className="size-4" aria-hidden />
            </span>
            <CardTitle className="font-heading text-lg tracking-tight">
              {total} unread notification{total !== 1 ? 's' : ''}
            </CardTitle>
          </div>
          <Link
            href="/notifications"
            className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
          >
            View all
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {entries.map(([event, count]) => (
            <span
              key={event}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-semibold tabular-nums ${EVENT_TONE[event]}`}
            >
              {count} {EVENT_LABELS[event]}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
