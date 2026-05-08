'use client'

import { Paperclip } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { getAttachmentDownloadUrl } from '@/lib/chat/chat-actions'
import type { ChatMessage } from '@/lib/chat/types'
import { cn } from '@/lib/utils'

function formatTimeUtc(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  // Deterministic UTC time avoids hydration mismatch between server and browser locales.
  return d.toISOString().slice(11, 16)
}

function MessageBubble({
  message,
  isMine,
  isSystem,
}: {
  message: ChatMessage
  isMine: boolean
  isSystem: boolean
}) {
  if (isSystem) {
    return (
      <li className="flex justify-center">
        <p className="text-muted-foreground bg-muted/50 rounded-full px-3 py-1 text-xs font-medium">
          {message.body}
        </p>
      </li>
    )
  }

  return (
    <li className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
      {!isMine && message.sender_name && (
        <p className="text-muted-foreground mb-1 px-1 text-xs font-medium">{message.sender_name}</p>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {message.body}
        {message.attachments.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {message.attachments.map((att) => (
              <li key={att.id}>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await getAttachmentDownloadUrl(att.storage_path)
                    if (res.ok) window.open(res.url, '_blank', 'noopener,noreferrer')
                  }}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium underline-offset-2 hover:underline',
                    isMine
                      ? 'bg-primary-foreground/15 text-primary-foreground'
                      : 'bg-background text-foreground'
                  )}
                >
                  <Paperclip className="size-3 shrink-0" />
                  <span className="truncate">{att.file_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-muted-foreground mt-0.5 px-1 text-[0.65rem] tabular-nums">
        {formatTimeUtc(message.created_at)}
      </p>
    </li>
  )
}

export function MessageList({
  messages,
  currentUserId,
}: {
  messages: ChatMessage[]
  currentUserId: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  return (
    <div ref={scrollRef} className="px-block py-block flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
          No messages yet — say hi.
        </div>
      ) : (
        <ul className="gap-block flex flex-col">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.sender_id === currentUserId}
              isSystem={m.message_type === 'system'}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
