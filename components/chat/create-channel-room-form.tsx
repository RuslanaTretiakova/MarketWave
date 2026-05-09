'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createChannelRoom } from '@/lib/chat/chat-actions'

export function CreateChannelRoomForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<'support' | 'sales' | 'standard'>('support')

  return (
    <form
      className="border-border bg-muted/20 flex flex-wrap items-end gap-2 rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await createChannelRoom({ channel, title, participantIds: [] })
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          toast.success('Room created.')
          router.push(`/chats/${res.roomId}`)
        })
      }}
    >
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">Room title</span>
        <input
          type="text"
          className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Support case: ... / Sales thread: ..."
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">Channel</span>
        <select
          className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'support' | 'sales' | 'standard')}
          disabled={pending}
        >
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="standard">Standard</option>
        </select>
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? 'Creating…' : 'Create room'}
      </Button>
    </form>
  )
}
