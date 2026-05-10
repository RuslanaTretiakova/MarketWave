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
  return d.toISOString().slice(0, 16).replace('T', ' ')
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

  return (
    <>
      <li className="flex items-stretch">
        <Link
          href={chatHref}
          className={cn(
            'gap-inset p-block flex min-w-0 flex-1 items-start justify-between transition-colors',
            isActive ? 'bg-muted' : 'hover:bg-muted/50'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-foreground truncate text-sm font-medium">{title}</p>
              {room.status === 'archived' && (
                <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase">
                  Archived
                </span>
              )}
              {room.unread_count > 0 && (
                <span className="bg-primary text-primary-foreground inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums">
                  {room.unread_count}
                </span>
              )}
            </div>
            {room.kind === 'order' &&
              room.order_site_domain &&
              room.title &&
              room.title !== room.order_site_domain && (
                <p className="text-muted-foreground truncate text-xs">{room.order_site_domain}</p>
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
        {showMenu ? (
          <div className="border-border flex shrink-0 items-start border-l">
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-full min-h-12 w-10 items-center justify-center"
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
