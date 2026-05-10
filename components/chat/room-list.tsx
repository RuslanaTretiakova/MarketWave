'use client'

import { MessageSquare } from 'lucide-react'

import { ChatRoomRow } from '@/components/chat/chat-room-row'
import type { ChatRoomSummary } from '@/lib/chat/types'

export function RoomList({
  rooms,
  activeRoomId,
  currentUserId,
}: {
  rooms: ChatRoomSummary[]
  activeRoomId?: string
  currentUserId: string
}) {
  if (rooms.length === 0) {
    return (
      <div className="text-muted-foreground p-section flex flex-col items-center justify-center gap-2 text-center text-sm">
        <MessageSquare className="size-8 opacity-50" />
        <p>No conversations match your filters.</p>
        <p className="text-xs">Try clearing filters or start a new chat.</p>
      </div>
    )
  }

  return (
    <ul className="divide-border flex flex-col divide-y">
      {rooms.map((room) => (
        <ChatRoomRow
          key={room.id}
          room={room}
          activeRoomId={activeRoomId}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  )
}
