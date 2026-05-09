'use client'

import { useCallback, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  approveContent,
  cancelOrder,
  markPublished,
  requestChanges,
  resumeOrder,
  startOrder,
} from '@/lib/orders/order-actions'
import { submitContent } from '@/lib/orders/content-actions'
import type { OrderStatus, UserRole } from '@/lib/orders/load-order-detail'

type ConfirmDialog = { kind: 'cancel' } | { kind: 'publish' } | { kind: 'request_changes' } | null

export function OrderStatusActions({
  orderId,
  status,
  role,
  userId,
  orderUserId,
  copywriterId,
}: {
  orderId: string
  status: OrderStatus
  role: UserRole
  userId: string
  orderUserId: string
  copywriterId: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null)
  const [changeComment, setChangeComment] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const isStaff = role === 'admin' || role === 'manager'
  const isOwnOrder = userId === orderUserId
  const isAssignedCopywriter = role === 'copywriter' && userId === copywriterId

  function runAction(action: () => Promise<{ ok: boolean; message?: string }>) {
    setActionError(null)
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        setActionError((res as { ok: false; message: string }).message)
        toast.error((res as { ok: false; message: string }).message)
      } else {
        toast.success('Order updated.')
        setConfirmDialog(null)
        setChangeComment('')
        setPublishedUrl('')
      }
    })
  }

  const handleConfirmCancel = useCallback(() => {
    runAction(() => cancelOrder(orderId))
  }, [orderId])

  const handleConfirmPublish = useCallback(() => {
    const url = publishedUrl.trim()
    if (!url) {
      setActionError('Please enter the published URL.')
      return
    }
    runAction(() => markPublished(orderId, url))
  }, [orderId, publishedUrl])

  const handleConfirmRequestChanges = useCallback(() => {
    if (!changeComment.trim()) {
      setActionError('Please enter a comment.')
      return
    }
    runAction(() => requestChanges(orderId, changeComment))
  }, [orderId, changeComment])

  const actions: React.ReactNode[] = []

  if (isStaff && status === 'new') {
    actions.push(
      <Button
        key="start"
        type="button"
        variant="cta"
        onClick={() => runAction(() => startOrder(orderId))}
        disabled={pending}
      >
        Start order
      </Button>
    )
  }

  if (isAssignedCopywriter && (status === 'in_progress' || status === 'needs_changes')) {
    actions.push(
      <Button
        key="content-submit"
        type="button"
        variant="cta"
        onClick={() => runAction(() => submitContent(orderId))}
        disabled={pending}
      >
        {status === 'needs_changes' ? 'Re-submit for review' : 'Submit for review'}
      </Button>
    )
  }

  if (role === 'client' && isOwnOrder && status === 'content_sent') {
    actions.push(
      <Button
        key="approve"
        type="button"
        variant="cta"
        onClick={() => runAction(() => approveContent(orderId))}
        disabled={pending}
      >
        Approve content
      </Button>,
      <Button
        key="changes"
        type="button"
        variant="outline"
        onClick={() => setConfirmDialog({ kind: 'request_changes' })}
        disabled={pending}
      >
        Request changes
      </Button>
    )
  }

  if (isStaff && status === 'needs_changes') {
    actions.push(
      <Button
        key="resume"
        type="button"
        variant="cta"
        onClick={() => runAction(() => resumeOrder(orderId))}
        disabled={pending}
      >
        Resume order
      </Button>
    )
  }

  if (isStaff && status === 'content_approved') {
    actions.push(
      <Button
        key="publish"
        type="button"
        variant="cta"
        onClick={() => setConfirmDialog({ kind: 'publish' })}
        disabled={pending}
      >
        Mark published
      </Button>
    )
  }

  if (
    (role === 'client' && isOwnOrder && status === 'new') ||
    (isStaff && status !== 'completed' && status !== 'canceled')
  ) {
    actions.push(
      <Button
        key="cancel"
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirmDialog({ kind: 'cancel' })}
        disabled={pending}
      >
        Cancel order
      </Button>
    )
  }

  if (actions.length === 0) return null

  return (
    <>
      <div className="gap-inset flex flex-wrap">{actions}</div>

      {actionError && (
        <p className="text-destructive mt-inset text-sm" role="alert">
          {actionError}
        </p>
      )}

      {/* Cancel confirm dialog */}
      <Dialog
        open={confirmDialog?.kind === 'cancel'}
        onOpenChange={(o) => !o && setConfirmDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The order will be permanently canceled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel} disabled={pending}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirm dialog */}
      <Dialog
        open={confirmDialog?.kind === 'publish'}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDialog(null)
            setPublishedUrl('')
            setActionError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as published</DialogTitle>
            <DialogDescription>
              Paste the live URL where the content was published. This will be shared with the
              client and the order will move to published status.
            </DialogDescription>
          </DialogHeader>
          <label className="gap-inset flex flex-col text-sm">
            <span className="text-foreground font-medium">Published URL</span>
            <input
              type="url"
              required
              autoFocus
              value={publishedUrl}
              onChange={(e) => setPublishedUrl(e.target.value)}
              placeholder="https://example.com/post"
              maxLength={2048}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 rounded-md border px-3 text-sm"
            />
          </label>
          {actionError && (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          )}
          <DialogFooter className="gap-inset">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog(null)
                setPublishedUrl('')
                setActionError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="cta"
              onClick={handleConfirmPublish}
              disabled={pending || !publishedUrl.trim()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request changes dialog */}
      <Dialog
        open={confirmDialog?.kind === 'request_changes'}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDialog(null)
            setChangeComment('')
            setActionError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Describe the changes needed. The order will be sent back for revision.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={changeComment}
            onChange={(e) => setChangeComment(e.target.value)}
            placeholder="Describe the changes needed…"
            rows={4}
            maxLength={2000}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
          />
          {actionError && (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          )}
          <DialogFooter className="gap-inset">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog(null)
                setChangeComment('')
                setActionError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="cta"
              onClick={handleConfirmRequestChanges}
              disabled={pending || !changeComment.trim()}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
