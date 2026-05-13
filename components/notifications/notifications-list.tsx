'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Check, ExternalLink } from 'lucide-react'
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
import { cn } from '@/lib/utils'

function eventLabel(event: NotificationRow['event']): string {
  return event.replaceAll('_', ' ')
}

const CHAT_ROOM_PREFIX_RE = /^\[room:([0-9a-f-]{36})\]\s*/i

function parseChatRoomRef(message: string | null): {
  roomId: string | null
  displayMessage: string
} {
  if (!message) return { roomId: null, displayMessage: '' }
  const match = message.match(CHAT_ROOM_PREFIX_RE)
  if (!match) return { roomId: null, displayMessage: message }
  return { roomId: match[1], displayMessage: message.slice(match[0].length) }
}

function notificationHref(row: NotificationRow): string | null {
  if (row.event === 'chat_message') {
    const { roomId } = parseChatRoomRef(row.message)
    if (roomId) return `/chats/${roomId}`
  }
  if (row.site_id) return `/sites/${row.site_id}`
  if (row.order_id) return `/orders/${row.order_id}`
  return null
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

  function runMarkRead(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()

    markNotificationRead(id).then((res) => {
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
        <Card className="p-section text-muted-foreground bg-background text-sm">
          No notifications yet.
        </Card>
      ) : (
        <Card className="bg-background overflow-hidden p-0">
          <div className="flex flex-col">
            {rows.map((row) => {
              const href = notificationHref(row)
              const isUnread = !row.read_at
              const displayMessage =
                row.event === 'chat_message'
                  ? parseChatRoomRef(row.message).displayMessage
                  : row.message

              const inner = (
                <div className="flex w-full min-w-0 flex-1 items-start gap-3">
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      isUnread ? 'bg-sky-500' : 'bg-transparent'
                    )}
                    aria-hidden
                  />

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isUnread ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {row.title}
                    </p>

                    <p
                      className={cn(
                        'text-sm',
                        isUnread ? 'text-muted-foreground' : 'text-muted-foreground/60'
                      )}
                    >
                      {displayMessage}
                    </p>

                    <p className="text-muted-foreground/60 text-xs">
                      {eventLabel(row.event)} · {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )

              const actions = (
                <div className="flex shrink-0 items-center gap-1">
                  {isUnread ? (
                    <button
                      type="button"
                      onClick={(e) => runMarkRead(e, row.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-8 items-center justify-center rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="size-4" />
                      <span className="sr-only">Mark as read</span>
                    </button>
                  ) : null}

                  {href ? (
                    <ExternalLink className="text-muted-foreground/40 size-3.5" aria-hidden />
                  ) : null}
                </div>
              )

              const rowClassName = cn(
                'w-full px-section py-3 flex items-start justify-between gap-3 transition-colors bg-transparent hover:bg-muted/50'
              )

              return href ? (
                <Link
                  key={row.id}
                  href={href}
                  className={rowClassName}
                  onClick={() => {
                    if (isUnread) {
                      markNotificationRead(row.id)
                    }
                  }}
                >
                  {inner}
                  {actions}
                </Link>
              ) : (
                <div key={row.id} className={rowClassName}>
                  {inner}
                  {actions}
                </div>
              )
            })}
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
