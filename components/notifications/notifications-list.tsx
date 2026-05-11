'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications/notification-actions'
import type { NotificationRow } from '@/lib/notifications/load-notifications'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'

function eventLabel(event: NotificationRow['event']): string {
  return event.replaceAll('_', ' ')
}

export function NotificationsList({
  rows,
  page,
  totalCount,
}: {
  rows: NotificationRow[]
  page: number
  totalCount: number
}) {
  const [pending, startTransition] = useTransition()

  function runMarkAllRead() {
    startTransition(async () => {
      const res = await markAllNotificationsRead()
      if (!res.ok) toast.error(res.message)
      else toast.success('All notifications marked as read.')
    })
  }

  function runMarkRead(id: string) {
    startTransition(async () => {
      const res = await markNotificationRead(id)
      if (!res.ok) toast.error(res.message)
    })
  }

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <PageHeader
        title="Notifications"
        description="Track assignments, content review events, publication updates, and invoice updates."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={runMarkAllRead}
          >
            Mark all read
          </Button>
        }
      />

      {rows.length === 0 ? (
        <Card className="p-section text-muted-foreground text-sm">No notifications yet.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-border divide-y">
            {rows.map((row) => (
              <div key={row.id} className="p-section flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-foreground font-medium">{row.title}</p>
                  <p className="text-muted-foreground text-sm">{row.message}</p>
                  <p className="text-muted-foreground text-xs">
                    {eventLabel(row.event)} · {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                {!row.read_at ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runMarkRead(row.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <SettingsTablePagination
            page={page}
            pageSize={SETTINGS_TABLE_PAGE_SIZE}
            totalCount={totalCount}
            buildHref={(p) => (p > 1 ? `/notifications?page=${p}` : '/notifications')}
          />
        </Card>
      )}
    </div>
  )
}
