import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ChatLayout } from '@/components/chat/chat-layout'
import { ChatsToolbar } from '@/components/chat/chats-toolbar'
import { NewChatDialog } from '@/components/chat/new-chat-dialog'
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

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Chats"
        description="Direct messages and order rooms."
        action={<NewChatDialog currentUserId={user.id} />}
      />

      <section className="border-border/60 bg-card shadow-soft sticky top-14 z-30 overflow-hidden rounded-2xl border">
        <Suspense fallback={null}>
          <ChatsToolbar totalCount={rooms.length} />
        </Suspense>
      </section>

      <ChatLayout rooms={rooms} currentUserId={user.id}>
        <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
          <div className="gap-block flex max-w-xs flex-col">
            <p className="text-foreground text-base font-medium">Pick a conversation</p>
            <p>
              Choose a room from the left to start chatting. Order rooms are opened from the order
              detail page.
            </p>
          </div>
        </div>
      </ChatLayout>
    </div>
  )
}
