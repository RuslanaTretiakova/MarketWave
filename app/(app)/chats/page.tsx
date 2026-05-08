import { notFound } from 'next/navigation'

import { ChatLayout } from '@/components/chat/chat-layout'
import { loadChatRooms } from '@/lib/chat/load-rooms'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Chats',
}

export default async function ChatsIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const rooms = await loadChatRooms(user.id)

  return (
    <ChatLayout rooms={rooms}>
      <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
        <div className="gap-block flex max-w-xs flex-col">
          <p className="text-foreground text-base font-medium">Pick a conversation</p>
          <p>
            Choose a room from the left to start chatting. Order rooms appear automatically when an
            order is created.
          </p>
        </div>
      </div>
    </ChatLayout>
  )
}
