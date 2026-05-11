'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { MenuActionDialog } from '@/components/ui/menu-action-dialog'
import { TableRowActionsTrigger } from '@/components/ui/table-row-actions-trigger'

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
import { markInvoicePaid, sendInvoiceEmail } from '@/lib/invoices/invoice-actions'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import { buttonVariants } from '@/components/ui/button'
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
          className={
            triggerVariant === 'button'
              ? cn(buttonVariants({ variant: 'outline', size: 'sm' }))
              : undefined
          }
          render={
            triggerVariant === 'icon' ? <TableRowActionsTrigger label="Order actions" /> : undefined
          }
        >
          {triggerVariant === 'button' ? 'Actions' : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
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
                    Approve
                  </DropdownMenuItem>
                )}
                {isOrderActionEnabled(actions, 'request_changes') && (
                  <DropdownMenuItem onClick={() => setDialog('request_changes')}>
                    Needs changes
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
                    Publish order
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}

          {(isOrderActionEnabled(actions, 'view_invoice') ||
            isOrderActionEnabled(actions, 'mark_invoice_paid') ||
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
                      runAction(() => sendInvoiceEmail(context.invoiceId!), 'Invoice sent.')
                    }
                  >
                    Send invoice
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

      <MenuActionDialog
        open={dialog === 'cancel_order'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Cancel order"
        description="This action cannot be undone."
        confirmVariant="destructive"
        confirmLabel="Confirm cancel"
        busy={pending}
        onConfirm={() => runAction(() => cancelOrder(orderId), 'Order canceled.')}
      />

      <MenuActionDialog
        open={dialog === 'request_changes'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setChangeComment('')
            setError(null)
          }
        }}
        title="Leave a comment"
        description="Describe what should change. The copywriter and team will see this."
        middle={
          <textarea
            value={changeComment}
            onChange={(event) => setChangeComment(event.target.value)}
            rows={4}
            maxLength={2000}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Describe what should be changed…"
          />
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Sending…' : 'Send'}
        confirmDisabled={!changeComment.trim()}
        busy={pending}
        onConfirm={() =>
          runAction(() => requestChanges(orderId, changeComment), 'Change request sent.')
        }
      />

      <MenuActionDialog
        open={dialog === 'publish'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setPublishedUrl('')
            setError(null)
          }
        }}
        title="Mark published"
        description="Provide the public URL of the published page."
        middle={
          <input
            type="url"
            value={publishedUrl}
            onChange={(event) => setPublishedUrl(event.target.value)}
            placeholder="https://example.com/post"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border px-3 text-sm"
          />
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Publishing…' : 'Publish'}
        confirmDisabled={!publishedUrl.trim()}
        busy={pending}
        onConfirm={() =>
          runAction(() => markPublished(orderId, publishedUrl), 'Order marked published.')
        }
      />

      <MenuActionDialog
        open={dialog === 'assign_copywriter'}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setCopywriterId(context.copywriterId ?? '')
          }
        }}
        title="Assign copywriter"
        description="Choose a copywriter for this order."
        middle={
          <select
            value={copywriterId}
            onChange={(event) => setCopywriterId(event.target.value)}
            className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {(copywriterOptions ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.full_name ?? option.email ?? option.id.slice(0, 8)}
              </option>
            ))}
          </select>
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Saving…' : 'Save'}
        busy={pending}
        onConfirm={() =>
          runAction(
            () => assignCopywriter(orderId, copywriterId || null),
            copywriterId ? 'Copywriter assigned.' : 'Copywriter unassigned.'
          )
        }
      />

      <MenuActionDialog
        open={dialog === 'edit_order'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Edit order"
        description="Update order-level details and requirements."
        contentClassName="max-w-lg"
        middle={
          <div className="gap-inset flex flex-col">
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Publish date</span>
              <input
                type="date"
                value={publishDate}
                onChange={(event) => setPublishDate(event.target.value)}
                className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Anchor text</span>
              <input
                type="text"
                maxLength={500}
                value={anchorText}
                onChange={(event) => setAnchorText(event.target.value)}
                className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Target URL</span>
              <input
                type="url"
                maxLength={2048}
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Requirements / notes</span>
              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                maxLength={4000}
                rows={4}
                className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>
          </div>
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Saving…' : 'Save changes'}
        busy={pending}
        onConfirm={() =>
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
      />

      <MenuActionDialog
        open={dialog === 'override_status'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Override status"
        description="Admin only: set a manual status for this order."
        middle={
          <select
            value={overrideStatus}
            onChange={(event) => setOverrideStatus(event.target.value as typeof overrideStatus)}
            className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
          >
            {ORDER_STATUSES_ORDERED.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        }
        confirmVariant="cta"
        confirmLabel={pending ? 'Applying…' : 'Apply'}
        busy={pending}
        onConfirm={() =>
          runAction(() => overrideOrderStatus(orderId, overrideStatus), 'Order status overridden.')
        }
      />

      <MenuActionDialog
        open={dialog === 'delete_order'}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Delete order"
        description="This removes the order permanently. Allowed only for new or canceled orders."
        confirmVariant="destructive"
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        busy={pending}
        onConfirm={() => runAction(() => deleteOrder(orderId), 'Order deleted.')}
      />
    </>
  )
}
