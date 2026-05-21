'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { MessageComposer } from '@/components/chat/message-composer'
import { MessageList } from '@/components/chat/message-list'
import { markRoomRead } from '@/lib/chat/chat-actions'
import { clientChatChannelLabel } from '@/lib/chat/channel'
import { canSendMessages } from '@/lib/chat/chat-rules'
import type { ChatMessage, ChatRoomDetail } from '@/lib/chat/types'
import { createClient } from '@/lib/supabase/client'

type ChatMessageRow = {
  id: string
  room_id: string
  sender_id: string | null
  body: string
  message_type: 'text' | 'system'
  created_at: string
}

export function ChatShell({
  room,
  currentUserId,
}: {
  room: ChatRoomDetail
  currentUserId: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(room.messages)
  const knownIdsRef = useRef(new Set(room.messages.map((m) => m.id)))
  const supabase = createClient()
  const lastReadMarkRef = useRef<number>(0)

  // Stable lookup for participant names; refreshed only when participants change reference.
  const senderNameLookupRef = useRef(
    new Map(room.participants.map((p) => [p.user_id, p.full_name] as const))
  )
  useEffect(() => {
    senderNameLookupRef.current = new Map(
      room.participants.map((p) => [p.user_id, p.full_name] as const)
    )
  }, [room.participants])

  const markReadDebounced = useCallback(() => {
    const now = Date.now()
    if (now - lastReadMarkRef.current < 5000) return
    lastReadMarkRef.current = now
    void markRoomRead(room.id)
  }, [room.id])

  useEffect(() => {
    void markRoomRead(room.id)

    const channel = supabase
      .channel(`chat:${room.id}`)
      .on<ChatMessageRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const m = payload.new
          if (!m || !m.id) return
          if (knownIdsRef.current.has(m.id)) return
          knownIdsRef.current.add(m.id)

          setMessages((prev) => [
            ...prev,
            {
              id: m.id,
              room_id: m.room_id,
              sender_id: m.sender_id,
              sender_name: m.sender_id
                ? (senderNameLookupRef.current.get(m.sender_id) ?? null)
                : null,
              body: m.body,
              message_type: m.message_type,
              created_at: m.created_at,
              attachments: [],
              read_by: [],
            },
          ])

          if (m.sender_id !== currentUserId) {
            markReadDebounced()
          }
        }
      )
      .subscribe()

    const focusHandler = () => markReadDebounced()
    window.addEventListener('focus', focusHandler)

    return () => {
      void supabase.removeChannel(channel)
      window.removeEventListener('focus', focusHandler)
    }
  }, [room.id, currentUserId, markReadDebounced, supabase])

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <header className="border-border gap-inset px-inset flex h-16 items-center border-b">
        <div className="min-w-0 flex-1">
          <h2 className="text-foreground truncate text-sm font-semibold">
            {room.title ?? room.order_site_domain ?? 'Conversation'}
          </h2>
          <p className="text-muted-foreground truncate text-xs">
            {clientChatChannelLabel(room.channel)}
            {room.status === 'archived' ? ' · Archived' : ''} · {room.participants.length} member
            {room.participants.length === 1 ? '' : 's'}
            {room.kind === 'order' && room.order_id ? (
              <>
                {' '}
                ·{' '}
                <a href={`/orders/${room.order_id}`} className="text-primary hover:underline">
                  Open order
                </a>
              </>
            ) : null}
          </p>
        </div>
      </header>
      <MessageList messages={messages} currentUserId={currentUserId} />
      {canSendMessages(room.status) ? (
        <MessageComposer roomId={room.id} />
      ) : (
        <div className="border-border bg-muted/30 text-muted-foreground p-block border-t text-center text-sm">
          {room.kind === 'order'
            ? 'This order is closed — the chat is read-only.'
            : 'This chat is archived — messaging is disabled. Unarchive from the list to reply.'}
        </div>
      )}
    </div>
  )
}
