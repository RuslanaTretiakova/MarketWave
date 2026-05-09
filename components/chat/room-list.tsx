'use client'

import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

import { clientChatChannelLabel } from '@/lib/chat/channel'
import type { ChatRoomSummary } from '@/lib/chat/types'
import { cn } from '@/lib/utils'

function formatTimestamp(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Deterministic UTC formatting prevents SSR/client locale hydration mismatch.
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

export function RoomList({
  rooms,
  activeRoomId,
}: {
  rooms: ChatRoomSummary[]
  activeRoomId?: string
}) {
  if (rooms.length === 0) {
    return (
      <div className="text-muted-foreground p-section flex flex-col items-center justify-center gap-2 text-center text-sm">
        <MessageSquare className="size-8 opacity-50" />
        <p>No conversations yet.</p>
        <p className="text-xs">Place an order or wait to be added to a room.</p>
      </div>
    )
  }

  return (
    <ul className="divide-border flex flex-col divide-y">
      {rooms.map((room) => {
        const isActive = activeRoomId === room.id
        const title = room.title ?? room.order_site_domain ?? 'Conversation'
        return (
          <li key={room.id}>
            <Link
              href={`/chats/${room.id}`}
              className={cn(
                'gap-inset p-block flex items-start justify-between transition-colors',
                isActive ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-medium">{title}</p>
                  {room.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums">
                      {room.unread_count}
                    </span>
                  )}
                </div>
                {room.kind === 'order' &&
                  room.order_site_domain &&
                  room.title &&
                  room.title !== room.order_site_domain && (
                    <p className="text-muted-foreground truncate text-xs">
                      {room.order_site_domain}
                    </p>
                  )}
                <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                  {clientChatChannelLabel(room.channel)}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {room.last_message_body ?? 'No messages yet'}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-[0.65rem] tabular-nums">
                {formatTimestamp(room.last_message_at)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
