'use client'

import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { assignCopywriter } from '@/lib/orders/assign-copywriter-action'
import { submitContent } from '@/lib/orders/content-actions'
import {
  cancelOrder,
  startOrder,
  approveContent,
  requestChanges,
  resumeOrder,
  markPublished,
  overrideOrderStatus,
  updateOrderFields,
  deleteOrder,
} from '@/lib/orders/order-actions'
import { ORDER_STATUS_LABEL, ORDER_STATUSES_ORDERED } from '@/lib/orders/order-status-labels'
import {
  getOrderActionAvailability,
  isOrderActionEnabled,
  type OrderActionContext,
} from '@/lib/orders/order-action-matrix'
import {
  cancelInvoice,
  markInvoiceOverdue,
  markInvoicePaid,
  sendInvoiceEmail,
} from '@/lib/invoices/invoice-actions'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type DialogKind =
  | 'cancel_order'
  | 'request_changes'
  | 'publish'
  | 'assign_copywriter'
  | 'edit_order'
  | 'override_status'
  | 'delete_order'
  | null

export function OrderActionsMenu({
  context,
  orderId,
  detailHref,
  invoiceHref,
  copywriterOptions,
  initialPublishDate,
  initialAnchorText,
  initialTargetUrl,
  initialClientNotes,
  triggerVariant = 'icon',
}: {
  context: OrderActionContext
  orderId: string
  detailHref: string
  invoiceHref?: string
  copywriterOptions?: CopywriterOption[]
  initialPublishDate?: string | null
  initialAnchorText?: string | null
  initialTargetUrl?: string | null
  initialClientNotes?: string | null
  triggerVariant?: 'icon' | 'button'
}) {
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [error, setError] = useState<string | null>(null)
  const [changeComment, setChangeComment] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [copywriterId, setCopywriterId] = useState(context.copywriterId ?? '')
  const [publishDate, setPublishDate] = useState(initialPublishDate ?? '')
  const [anchorText, setAnchorText] = useState(initialAnchorText ?? '')
  const [targetUrl, setTargetUrl] = useState(initialTargetUrl ?? '')
  const [clientNotes, setClientNotes] = useState(initialClientNotes ?? '')
  const [overrideStatus, setOverrideStatus] = useState(context.status)

  const actions = useMemo(() => getOrderActionAvailability(context), [context])

  function runAction(
    action: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string
  ) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        const message = (res as { ok: false; message: string }).message
        setError(message)
        toast.error(message)
        return
      }
      toast.success(successMessage)
      setDialog(null)
      setChangeComment('')
      setPublishedUrl('')
    })
  }

  const hasAnyAction =
    actions.some((item) => item.enabled && item.id !== 'view_details') ||
    isOrderActionEnabled(actions, 'view_details')
  if (!hasAnyAction) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label="Order actions"
          className={cn(
            triggerVariant === 'icon'
              ? cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')
              : cn(buttonVariants({ variant: 'outline', size: 'sm' }))
          )}
        >
          {triggerVariant === 'icon' ? (
            <MoreHorizontal className="size-4" aria-hidden />
          ) : (
            'Actions'
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Order
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={detailHref} />}>Open details</DropdownMenuItem>
            {isOrderActionEnabled(actions, 'edit_order') && (
              <DropdownMenuItem onClick={() => setDialog('edit_order')}>
                Edit order
              </DropdownMenuItem>
            )}
            {isOrderActionEnabled(actions, 'start_order') && (
              <DropdownMenuItem
                onClick={() => runAction(() => startOrder(orderId), 'Order moved to In progress.')}
              >
                Start order
              </DropdownMenuItem>
            )}
            {isOrderActionEnabled(actions, 'assign_copywriter') && (
              <DropdownMenuItem onClick={() => setDialog('assign_copywriter')}>
                Assign copywriter
              </DropdownMenuItem>
            )}
            {isOrderActionEnabled(actions, 'cancel_order') && (
              <DropdownMenuItem onClick={() => setDialog('cancel_order')} variant="destructive">
                Cancel order
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          {(isOrderActionEnabled(actions, 'submit_content') ||
            isOrderActionEnabled(actions, 'approve_content') ||
            isOrderActionEnabled(actions, 'request_changes') ||
            isOrderActionEnabled(actions, 'resume_order') ||
            isOrderActionEnabled(actions, 'publish_order')) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  Content
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOrderActionEnabled(actions, 'submit_content') && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(
                        () => submitContent(orderId),
                        context.status === 'needs_changes'
                          ? 'Content re-submitted for review.'
                          : 'Content submitted for review.'
                      )
                    }
                  >
                    {context.status === 'needs_changes'
                      ? 'Re-submit for review'
                      : 'Submit for review'}
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'approve_content') && (
                  <DropdownMenuItem
                    onClick={() => runAction(() => approveContent(orderId), 'Content approved.')}
                  >
                    Approve content
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'request_changes') && (
                  <DropdownMenuItem onClick={() => setDialog('request_changes')}>
                    Request changes
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'resume_order') && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(() => resumeOrder(orderId), 'Order moved to In progress.')
                    }
                  >
                    Resume order
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'publish_order') && (
                  <DropdownMenuItem onClick={() => setDialog('publish')}>
                    Mark published
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {(isOrderActionEnabled(actions, 'view_invoice') ||
            isOrderActionEnabled(actions, 'mark_invoice_paid') ||
            isOrderActionEnabled(actions, 'mark_invoice_overdue') ||
            isOrderActionEnabled(actions, 'cancel_invoice') ||
            isOrderActionEnabled(actions, 'send_invoice')) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  Invoice
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {invoiceHref && isOrderActionEnabled(actions, 'view_invoice') && (
                  <DropdownMenuItem render={<Link href={invoiceHref} />}>
                    Open invoice
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'send_invoice') && context.invoiceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(
                        () => sendInvoiceEmail(context.invoiceId!),
                        'Invoice marked as sent.'
                      )
                    }
                  >
                    Send / resend invoice
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'mark_invoice_paid') && context.invoiceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(() => markInvoicePaid(context.invoiceId!), 'Invoice marked paid.')
                    }
                  >
                    Mark invoice paid
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'mark_invoice_overdue') && context.invoiceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(
                        () => markInvoiceOverdue(context.invoiceId!),
                        'Invoice marked overdue.'
                      )
                    }
                  >
                    Mark invoice overdue
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'cancel_invoice') && context.invoiceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      runAction(() => cancelInvoice(context.invoiceId!), 'Invoice canceled.')
                    }
                    variant="destructive"
                  >
                    Cancel invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {(isOrderActionEnabled(actions, 'override_status') ||
            isOrderActionEnabled(actions, 'delete_order')) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  Admin
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isOrderActionEnabled(actions, 'override_status') && (
                  <DropdownMenuItem onClick={() => setDialog('override_status')}>
                    Override status
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'delete_order') && (
                  <DropdownMenuItem variant="destructive" onClick={() => setDialog('delete_order')}>
                    Delete order
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <p className="text-destructive mt-inset text-sm" role="alert">
          {error}
        </p>
      )}

      <Dialog open={dialog === 'cancel_order'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => runAction(() => cancelOrder(orderId), 'Order canceled.')}
            >
              Confirm cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'request_changes'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setChangeComment('')
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>Add revision notes for the copywriter.</DialogDescription>
          </DialogHeader>
          <textarea
            value={changeComment}
            onChange={(event) => setChangeComment(event.target.value)}
            rows={4}
            maxLength={2000}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Describe what should be changed..."
          />
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="cta"
              disabled={pending || !changeComment.trim()}
              onClick={() =>
                runAction(() => requestChanges(orderId, changeComment), 'Change request sent.')
              }
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'publish'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setPublishedUrl('')
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark published</DialogTitle>
            <DialogDescription>Provide the public URL of the published page.</DialogDescription>
          </DialogHeader>
          <input
            type="url"
            value={publishedUrl}
            onChange={(event) => setPublishedUrl(event.target.value)}
            placeholder="https://example.com/post"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 rounded-md border px-3 text-sm"
          />
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="cta"
              disabled={pending || !publishedUrl.trim()}
              onClick={() =>
                runAction(() => markPublished(orderId, publishedUrl), 'Order marked published.')
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'assign_copywriter'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setCopywriterId(context.copywriterId ?? '')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign copywriter</DialogTitle>
            <DialogDescription>Choose a copywriter for this order.</DialogDescription>
          </DialogHeader>
          <select
            value={copywriterId}
            onChange={(event) => setCopywriterId(event.target.value)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {(copywriterOptions ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.full_name ?? option.email ?? option.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="cta"
              onClick={() =>
                runAction(
                  () => assignCopywriter(orderId, copywriterId || null),
                  copywriterId ? 'Copywriter assigned.' : 'Copywriter unassigned.'
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'edit_order'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit order</DialogTitle>
            <DialogDescription>Update order-level details and requirements.</DialogDescription>
          </DialogHeader>
          <div className="gap-inset flex flex-col">
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Publish date</span>
              <input
                type="date"
                value={publishDate}
                onChange={(event) => setPublishDate(event.target.value)}
                className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Anchor text</span>
              <input
                type="text"
                maxLength={500}
                value={anchorText}
                onChange={(event) => setAnchorText(event.target.value)}
                className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Target URL</span>
              <input
                type="url"
                maxLength={2048}
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Requirements / notes</span>
              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                maxLength={4000}
                rows={4}
                className="border-border bg-background text-foreground rounded-md border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="cta"
              onClick={() =>
                runAction(
                  () =>
                    updateOrderFields({
                      orderId,
                      publishDate: publishDate || null,
                      anchorText,
                      targetUrl,
                      clientNotes,
                    }),
                  'Order updated.'
                )
              }
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'override_status'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override status</DialogTitle>
            <DialogDescription>Admin only: set a manual status for this order.</DialogDescription>
          </DialogHeader>
          <select
            value={overrideStatus}
            onChange={(event) => setOverrideStatus(event.target.value as typeof overrideStatus)}
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          >
            {ORDER_STATUSES_ORDERED.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="cta"
              onClick={() =>
                runAction(
                  () => overrideOrderStatus(orderId, overrideStatus),
                  'Order status overridden.'
                )
              }
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete_order'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete order</DialogTitle>
            <DialogDescription>
              This removes the order permanently. Allowed only for new or canceled orders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-inset">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => runAction(() => deleteOrder(orderId), 'Order deleted.')}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
