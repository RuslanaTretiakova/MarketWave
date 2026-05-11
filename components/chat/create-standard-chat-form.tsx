'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FormControlInput } from '@/components/ui/form-control'
import { createStandardGroupChat } from '@/lib/chat/chat-actions'
import { searchProfilesForChatAction } from '@/lib/chat/search-participants'

export function CreateStandardChatForm({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [searchQ, setSearchQ] = useState('')
  const [hits, setHits] = useState<{ id: string; label: string }[]>([])

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
    if (id === currentUserId || participantIds.includes(id)) return
    setParticipantIds((prev) => [...prev, id])
    setLabels((prev) => ({ ...prev, [id]: label }))
    setSearchQ('')
    setHits([])
  }

  function removeParticipant(id: string) {
    setParticipantIds((prev) => prev.filter((x) => x !== id))
  }

  return (
    <form
      className="border-border bg-muted/20 gap-block flex flex-col rounded-lg border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await createStandardGroupChat({
            title: title.trim() || undefined,
            participantIds,
          })
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          toast.success('Chat created.')
          setTitle('')
          setParticipantIds([])
          setLabels({})
          router.push(`/chats/${res.roomId}`)
          router.refresh()
        })
      }}
    >
      <p className="text-foreground text-sm font-medium">Create chat</p>
      <div className="gap-inset flex flex-wrap items-end">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Title (optional)</span>
          <FormControlInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Defaults to participant names"
            disabled={pending}
            maxLength={120}
          />
        </label>
      </div>
      <div className="gap-inset flex flex-col">
        <span className="text-muted-foreground text-xs">Participants (required)</span>
        <ul className="gap-inset flex min-h-8 flex-wrap">
          {participantIds.map((id) => (
            <li
              key={id}
              className="bg-background border-border gap-inset inline-flex items-center rounded-full border px-2 py-1 text-xs"
            >
              {labels[id] ?? id.slice(0, 8)}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove"
                onClick={() => removeParticipant(id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="relative">
          <FormControlInput
            placeholder="Search people to add…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            disabled={pending}
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
      <Button type="submit" variant="cta" size="sm" className="w-fit" disabled={pending}>
        {pending ? 'Creating…' : 'Create chat'}
      </Button>
    </form>
  )
}
