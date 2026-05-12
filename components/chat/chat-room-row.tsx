'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { EditChatSheet } from '@/components/chat/edit-chat-sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { archiveChat, unarchiveChat } from '@/lib/chat/chat-actions'
import { canArchiveChat, canEditChatMetadata, canUnarchiveChat } from '@/lib/chat/chat-rules'
import { clientChatChannelLabel } from '@/lib/chat/channel'
import type { ChatRoomSummary } from '@/lib/chat/types'
import { cn } from '@/lib/utils'

function formatTimestamp(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return d.toISOString().slice(11, 16)
  if (diffDays < 7) return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function channelDotClass(channel: string | null): string {
  if (channel === 'support') return 'bg-blue-500'
  if (channel === 'sales') return 'bg-emerald-500'
  return 'bg-muted-foreground'
}

export function ChatRoomRow({
  room,
  activeRoomId,
  currentUserId,
}: {
  room: ChatRoomSummary
  activeRoomId?: string
  currentUserId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  const chatHref = qs ? `/chats/${room.id}?${qs}` : `/chats/${room.id}`
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const isActive = activeRoomId === room.id
  const title = room.title ?? room.order_site_domain ?? 'Conversation'

  const showEdit = canEditChatMetadata(room.channel) && !room.system_managed
  const showArchive = canArchiveChat(room.channel, room.status, room.system_managed)
  const showUnarchive = canUnarchiveChat(room.channel, room.status)
  const showMenu = showEdit || showArchive || showUnarchive

  function runArchive() {
    if (!confirm('Archive this chat? You can restore it later from the list.')) return
    startTransition(async () => {
      const res = await archiveChat(room.id)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success('Chat archived.')
        router.refresh()
      }
    })
  }

  function runUnarchive() {
    startTransition(async () => {
      const res = await unarchiveChat(room.id)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success('Chat restored.')
        router.refresh()
      }
    })
  }

  const preview =
    room.kind === 'order' &&
    room.order_site_domain &&
    room.title &&
    room.title !== room.order_site_domain
      ? room.order_site_domain
      : (room.last_message_body ?? 'No messages yet')

  return (
    <>
      <li className="group flex items-stretch">
        <Link
          href={chatHref}
          className={cn(
            'p-block flex min-w-0 flex-1 items-start justify-between gap-2 border-l-2 transition-colors',
            isActive ? 'bg-muted border-primary' : 'hover:bg-muted/50 border-transparent'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-foreground truncate text-sm font-medium">{title}</p>
              {room.status === 'archived' && (
                <span className="text-muted-foreground shrink-0 rounded border px-1 py-px text-[0.6rem] font-medium">
                  Archived
                </span>
              )}
              {room.unread_count > 0 && (
                <span className="bg-primary text-primary-foreground inline-flex min-w-[1.1rem] shrink-0 items-center justify-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums">
                  {room.unread_count}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden">
              <span
                className={cn('size-1.5 shrink-0 rounded-full', channelDotClass(room.channel))}
                title={clientChatChannelLabel(room.channel)}
              />
              <p className="text-muted-foreground truncate text-xs">{preview}</p>
            </div>
          </div>
          <span className="text-muted-foreground mt-0.5 shrink-0 text-[0.65rem] tabular-nums">
            {formatTimestamp(room.last_message_at)}
          </span>
        </Link>
        {showMenu ? (
          <div className="flex shrink-0 items-start opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-full min-h-12 w-9 items-center justify-center"
                disabled={pending}
                aria-label="Chat actions"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {showEdit ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      setEditOpen(true)
                    }}
                  >
                    Edit chat
                  </DropdownMenuItem>
                ) : null}
                {showArchive ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      runArchive()
                    }}
                  >
                    Archive
                  </DropdownMenuItem>
                ) : null}
                {showUnarchive ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      runUnarchive()
                    }}
                  >
                    Unarchive
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </li>

      {showEdit ? (
        <EditChatSheet
          key={`${room.id}-${editOpen}`}
          open={editOpen}
          onOpenChange={setEditOpen}
          room={room}
          currentUserId={currentUserId}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  )
}
