import { notFound } from 'next/navigation'

import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatShell } from '@/components/chat/chat-shell'
import { loadChatRoom } from '@/lib/chat/load-room'
import { chatListFiltersFromSearchParams, loadChatRooms } from '@/lib/chat/load-rooms'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chat',
}

type SearchParams = {
  with?: string | string[]
  channel?: string | string[]
  status?: string | string[]
  from?: string | string[]
  to?: string | string[]
  sort?: string | string[]
}

export default async function ChatRoomPage(props: {
  params: Promise<{ roomId: string }>
  searchParams: Promise<SearchParams>
}) {
  const { roomId } = await props.params
  const sp = await props.searchParams

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

  const filters = chatListFiltersFromSearchParams(sp)
  const [rooms, room] = await Promise.all([
    loadChatRooms(user.id, filters),
    loadChatRoom(roomId, user.id),
  ])

  if (!room) notFound()

  return (
    <div className="mx-auto w-full max-w-6xl">
      <ChatLayout rooms={rooms} activeRoomId={room.id} currentUserId={user.id}>
        <ChatShell key={room.id} room={room} currentUserId={user.id} />
      </ChatLayout>
    </div>
  )
}
