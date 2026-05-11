'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FormControlInput } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { updateChatRoom } from '@/lib/chat/chat-actions'
import { searchProfilesForChatAction } from '@/lib/chat/search-participants'
import type { ChatRoomSummary } from '@/lib/chat/types'

export function EditChatSheet({
  open,
  onOpenChange,
  room,
  currentUserId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: ChatRoomSummary
  currentUserId: string
  onSaved: () => void
}) {
  const [title, setTitle] = useState(room.title ?? '')
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    room.participants.map((p) => p.user_id)
  )
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const p of room.participants) {
      o[p.user_id] = p.full_name?.trim() || p.user_id.slice(0, 8)
    }
    return o
  })
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<{ id: string; label: string }[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        if (searchQ.trim().length < 2) {
          setHits([])
          return
        }
        const res = await searchProfilesForChatAction(searchQ)
        if (!res.ok) return
        setHits(
          res.hits.map((h) => ({
            id: h.id,
            label: h.full_name?.trim() || h.email || h.id.slice(0, 8),
          }))
        )
      })()
    }, 250)
    return () => clearTimeout(t)
  }, [searchQ])

  function addParticipant(id: string, label: string) {
    if (participantIds.includes(id)) return
    setParticipantIds((prev) => [...prev, id])
    setLabels((prev) => ({ ...prev, [id]: label }))
    setSearchQ('')
    setHits([])
  }

  function removeParticipant(id: string) {
    if (id === currentUserId) return
    setParticipantIds((prev) => prev.filter((x) => x !== id))
  }

  const cannotEdit = room.status !== 'active'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col">
        <SheetHeader>
          <SheetTitle>Edit chat</SheetTitle>
          <SheetDescription>
            Update the title and who is in this conversation. You must stay in the chat.
          </SheetDescription>
        </SheetHeader>

        {cannotEdit ? (
          <p className="text-muted-foreground text-sm">Unarchive this chat before editing.</p>
        ) : (
          <form
            className="gap-block flex min-h-0 flex-1 flex-col overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault()
              startTransition(async () => {
                const res = await updateChatRoom({
                  roomId: room.id,
                  title: title.trim(),
                  participantIds,
                })
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success('Chat updated.')
                onOpenChange(false)
                onSaved()
              })
            }}
          >
            <div className="gap-inset flex flex-col">
              <Label htmlFor="edit-chat-title">Title</Label>
              <FormControlInput
                id="edit-chat-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="gap-inset flex flex-col">
              <Label>Participants</Label>
              <ul className="gap-inset flex flex-wrap">
                {participantIds.map((id) => (
                  <li
                    key={id}
                    className="bg-muted gap-inset inline-flex items-center rounded-full px-2 py-1 text-xs"
                  >
                    <span>{labels[id] ?? id.slice(0, 8)}</span>
                    {id !== currentUserId ? (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remove"
                        onClick={() => removeParticipant(id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <div className="relative">
                <FormControlInput
                  placeholder="Add people…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
                {hits.length > 0 && (
                  <ul className="border-border bg-background absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border text-sm shadow-md">
                    {hits.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          className="hover:bg-muted w-full px-3 py-2 text-left"
                          onClick={() => addParticipant(h.id, h.label)}
                        >
                          {h.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <SheetFooter className="mt-auto flex-row gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="cta" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
