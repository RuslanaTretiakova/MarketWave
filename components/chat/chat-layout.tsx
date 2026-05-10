import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { ChatsToolbar } from '@/components/chat/chats-toolbar'
import { RoomList } from '@/components/chat/room-list'
import type { ChatRoomSummary } from '@/lib/chat/types'

export function ChatLayout({
  rooms,
  activeRoomId,
  currentUserId,
  showToolbar = true,
  children,
}: {
  rooms: ChatRoomSummary[]
  activeRoomId?: string
  currentUserId: string
  showToolbar?: boolean
  children: ReactNode
}) {
  return (
    <div className="border-border bg-background mx-auto grid h-[calc(100vh-7rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[320px_1fr]">
      <aside className="border-border flex min-h-0 flex-col border-b md:border-r md:border-b-0">
        <header className="border-border p-block border-b">
          <h2 className="text-foreground text-base font-semibold">Conversations</h2>
        </header>
        {showToolbar ? (
          <Suspense fallback={null}>
            <ChatsToolbar />
          </Suspense>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Suspense fallback={null}>
            <RoomList rooms={rooms} activeRoomId={activeRoomId} currentUserId={currentUserId} />
          </Suspense>
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">{children}</section>
    </div>
  )
}
