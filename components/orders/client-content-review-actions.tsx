'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { MenuActionDialog } from '@/components/ui/menu-action-dialog'
import { approveContent, requestChanges } from '@/lib/orders/order-actions'

export function ClientContentReviewActions({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition()
  const [changesOpen, setChangesOpen] = useState(false)
  const [comment, setComment] = useState('')

  function approve() {
    startTransition(async () => {
      const res = await approveContent(orderId)
      if (!res.ok) toast.error(res.message)
      else toast.success('Content approved.')
    })
  }

  function sendChanges() {
    startTransition(async () => {
      const res = await requestChanges(orderId, comment)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success('Change request sent.')
        setChangesOpen(false)
        setComment('')
      }
    })
  }

  return (
    <>
      <div className="border-border bg-muted/30 mb-block px-section py-block rounded-lg border">
        <h4 className="text-foreground text-sm font-semibold">Review content</h4>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Read the article below. Approve it or request changes with a comment for the copywriter.
        </p>
        <div className="mt-block gap-inset flex flex-wrap">
          <Button type="button" size="sm" variant="cta" disabled={pending} onClick={approve}>
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setChangesOpen(true)}
          >
            Needs changes
          </Button>
        </div>
      </div>

      <MenuActionDialog
        open={changesOpen}
        onOpenChange={(open) => {
          if (!open) {
            setChangesOpen(false)
            setComment('')
          }
        }}
        title="Leave a comment"
        description="Describe what should change. The copywriter and team will see this."
        middle={
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Describe what should be changed…"
          />
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Sending…' : 'Send'}
        confirmDisabled={!comment.trim()}
        busy={pending}
        onConfirm={sendChanges}
      />
    </>
  )
}
