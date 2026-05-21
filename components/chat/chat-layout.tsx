import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { RoomList } from '@/components/chat/room-list'
import type { ChatRoomSummary } from '@/lib/chat/types'

export function ChatLayout({
  rooms,
  activeRoomId,
  currentUserId,
  children,
}: {
  rooms: ChatRoomSummary[]
  activeRoomId?: string
  currentUserId: string
  children: ReactNode
}) {
  const totalUnread = rooms.reduce((s, r) => s + r.unread_count, 0)

  return (
    <div className="border-border/60 bg-card shadow-soft grid h-[calc(100vh-14rem)] w-full grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-[320px_1fr]">
      <aside className="border-border flex min-h-0 flex-col border-b md:border-r md:border-b-0">
        <header className="border-border px-inset flex h-16 items-center justify-between border-b">
          <h2 className="text-foreground text-base font-semibold">Conversations</h2>
          {totalUnread > 0 && (
            <span className="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-semibold tabular-nums">
              {totalUnread}
            </span>
          )}
        </header>
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
