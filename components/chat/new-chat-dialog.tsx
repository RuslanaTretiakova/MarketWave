'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

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

export function NewChatDialog({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false)

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
            Start a direct or group conversation with your team.
          </DialogDescription>
        </DialogHeader>
        <CreateStandardChatForm currentUserId={currentUserId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
