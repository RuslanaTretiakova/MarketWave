import type { ReactNode } from 'react'

import { RoomList } from '@/components/chat/room-list'
import type { ChatRoomSummary } from '@/lib/chat/types'

export function ChatLayout({
  rooms,
  activeRoomId,
  children,
}: {
  rooms: ChatRoomSummary[]
  activeRoomId?: string
  children: ReactNode
}) {
  return (
    <div className="border-border bg-background mx-auto grid h-[calc(100vh-7rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[300px_1fr]">
      <aside className="border-border flex min-h-0 flex-col border-b md:border-r md:border-b-0">
        <header className="border-border p-block border-b">
          <h2 className="text-foreground text-base font-semibold">Conversations</h2>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <RoomList rooms={rooms} activeRoomId={activeRoomId} />
        </div>
      </aside>
      <section className="flex min-h-0 flex-col">{children}</section>
    </div>
  )
}
