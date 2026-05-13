'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { CreateChannelRoomForm } from '@/components/chat/create-channel-room-form'
import { CreateStandardChatForm } from '@/components/chat/create-standard-chat-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Tab = 'standard' | 'channel'

export function NewChatDialog({
  currentUserId,
  isStaff,
}: {
  currentUserId: string
  isStaff: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('standard')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="cta" size="xl" className="rounded-xl" />}>
        <Plus className="size-4" aria-hidden />
        New chat
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>
            {isStaff
              ? 'Create a direct or group conversation, or open a support / sales channel room.'
              : 'Start a direct or group conversation with your team.'}
          </DialogDescription>
        </DialogHeader>

        {isStaff && (
          <div className="bg-muted flex gap-0.5 rounded-full p-0.5">
            {(['standard', 'channel'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
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
          <CreateStandardChatForm currentUserId={currentUserId} onSuccess={() => setOpen(false)} />
        )}
        {isStaff && tab === 'channel' && (
          <CreateChannelRoomForm currentUserId={currentUserId} onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
