import { notFound } from 'next/navigation'

import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatShell } from '@/components/chat/chat-shell'
import { loadChatRoom } from '@/lib/chat/load-room'
import { loadChatRooms } from '@/lib/chat/load-rooms'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chat',
}

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) notFound()

  const [rooms, room] = await Promise.all([
    loadChatRooms(user.id),
    loadChatRoom(roomId, user.id, profile.role),
  ])

  if (!room) notFound()

  return (
    <ChatLayout rooms={rooms} activeRoomId={room.id}>
      <ChatShell key={room.id} room={room} currentUserId={user.id} />
    </ChatLayout>
  )
}
