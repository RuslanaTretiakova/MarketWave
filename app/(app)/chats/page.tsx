import { notFound } from 'next/navigation'

import { CreateChannelRoomForm } from '@/components/chat/create-channel-room-form'
import { CreateStandardChatForm } from '@/components/chat/create-standard-chat-form'
import { ChatLayout } from '@/components/chat/chat-layout'
import { PageHeader } from '@/components/ui/page-header'
import { chatListFiltersFromSearchParams, loadChatRooms } from '@/lib/chat/load-rooms'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chats',
}

type SearchParams = {
  with?: string | string[]
  channel?: string | string[]
  status?: string | string[]
  from?: string | string[]
  to?: string | string[]
  sort?: string | string[]
}

export default async function ChatsIndexPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const filters = chatListFiltersFromSearchParams(sp)
  const rooms = await loadChatRooms(user.id, filters)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isStaff = profile?.role === 'admin' || profile?.role === 'manager'

  return (
    <div className="space-y-block">
      <PageHeader title="Chats" description="Direct messages and order rooms." />
      <CreateStandardChatForm currentUserId={user.id} />
      {isStaff ? <CreateChannelRoomForm currentUserId={user.id} /> : null}
      <ChatLayout rooms={rooms} currentUserId={user.id}>
        <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
          <div className="gap-block flex max-w-xs flex-col">
            <p className="text-foreground text-base font-medium">Pick a conversation</p>
            <p>
              Choose a room from the left to start chatting. Order rooms appear automatically when
              an order is created.
            </p>
          </div>
        </div>
      </ChatLayout>
    </div>
  )
}
