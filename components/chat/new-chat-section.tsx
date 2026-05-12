'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import { CreateChannelRoomForm } from '@/components/chat/create-channel-room-form'
import { CreateStandardChatForm } from '@/components/chat/create-standard-chat-form'
import { cn } from '@/lib/utils'

type Tab = 'standard' | 'channel'

export function NewChatSection({
  currentUserId,
  isStaff,
}: {
  currentUserId: string
  isStaff: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('standard')

  return (
    <div className="border-border border-b">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/40 p-block flex w-full items-center justify-between text-sm transition-colors"
      >
        <span className="font-medium">+ New chat</span>
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {open && (
        <div className="bg-background p-block gap-inset flex flex-col border-b">
          {isStaff && (
            <div className="bg-muted flex gap-0.5 rounded-full p-0.5">
              {(['standard', 'channel'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                    tab === t
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'standard' ? 'Standard' : 'Channel'}
                </button>
              ))}
            </div>
          )}

          {(!isStaff || tab === 'standard') && (
            <CreateStandardChatForm
              currentUserId={currentUserId}
              onSuccess={() => setOpen(false)}
            />
          )}
          {isStaff && tab === 'channel' && (
            <CreateChannelRoomForm currentUserId={currentUserId} onSuccess={() => setOpen(false)} />
          )}
        </div>
      )}
    </div>
  )
}
