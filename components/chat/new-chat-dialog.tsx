'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { CreateStandardChatForm } from '@/components/chat/create-standard-chat-form'
import { SettingsRightSheet } from '@/components/settings/settings-right-sheet'
import { Button } from '@/components/ui/button'

export function NewChatDialog({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="cta" size="xl" className="rounded-xl" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New chat
      </Button>
      <SettingsRightSheet
        open={open}
        onOpenChange={setOpen}
        title="Start a new chat"
        description="Start a direct or group conversation with your team."
      >
        <CreateStandardChatForm currentUserId={currentUserId} onSuccess={() => setOpen(false)} />
      </SettingsRightSheet>
    </>
  )
}
