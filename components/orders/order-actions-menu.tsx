'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { SettingsRightSheet } from '@/components/settings/settings-right-sheet'
import { Button } from '@/components/ui/button'
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

type SheetAction =
  | 'request_changes'
  | 'publish'
  | 'assign_copywriter'
  | 'edit_order'
  | 'override_status'

type DialogKind = 'cancel_order' | 'delete_order' | null

function OrderSummaryBanner({
  domain,
  status,
  price,
}: {
  domain?: string
  status: string
  price?: number
}) {
  if (!domain) return null
  return (
    <div className="bg-muted/50 border-border mb-2 rounded-md border px-3 py-2 text-sm">
      <p className="text-foreground font-medium">{domain}</p>
      <p className="text-muted-foreground text-xs">
        {ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL] ?? status}
        {price !== undefined && ` · $${price.toFixed(2)}`}
      </p>
    </div>
  )
}

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
  siteDomain,
  price,
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
  siteDomain?: string
  price?: number
  triggerVariant?: 'icon' | 'button'
}) {
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [sheetAction, setSheetAction] = useState<SheetAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [changeComment, setChangeComment] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [publishDateForPublish, setPublishDateForPublish] = useState(initialPublishDate ?? '')
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
              <DropdownMenuItem onClick={() => setSheetAction('edit_order')}>
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
              <DropdownMenuItem onClick={() => setSheetAction('assign_copywriter')}>
                {context.copywriterId ? 'Reassign copywriter' : 'Assign copywriter'}
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
                  <DropdownMenuItem onClick={() => setSheetAction('request_changes')}>
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
                  <DropdownMenuItem onClick={() => setSheetAction('publish')}>
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
                  <DropdownMenuItem onClick={() => setSheetAction('override_status')}>
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

      <SettingsRightSheet
        open={sheetAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSheetAction(null)
            setChangeComment('')
            setPublishedUrl('')
            setPublishDateForPublish(initialPublishDate ?? '')
            setCopywriterId(context.copywriterId ?? '')
            setError(null)
          }
        }}
        title={
          sheetAction === 'request_changes'
            ? 'Leave a comment'
            : sheetAction === 'publish'
              ? 'Mark published'
              : sheetAction === 'assign_copywriter'
                ? context.copywriterId
                  ? 'Reassign copywriter'
                  : 'Assign copywriter'
                : sheetAction === 'edit_order'
                  ? 'Edit order'
                  : 'Override status'
        }
        description={
          sheetAction === 'request_changes'
            ? 'Describe what should change. The copywriter and team will see this.'
            : sheetAction === 'publish'
              ? 'Provide the public URL and confirm the publish date.'
              : sheetAction === 'assign_copywriter'
                ? context.copywriterId
                  ? 'Pick a different copywriter for this order. Both copywriters and the client will be notified.'
                  : 'Choose a copywriter for this order.'
                : sheetAction === 'edit_order'
                  ? 'Update order-level details and requirements.'
                  : 'Admin only: set a manual status for this order.'
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSheetAction(null)
                setChangeComment('')
                setPublishedUrl('')
                setPublishDateForPublish(initialPublishDate ?? '')
                setCopywriterId(context.copywriterId ?? '')
                setError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="cta"
              disabled={
                pending ||
                (sheetAction === 'request_changes' && !changeComment.trim()) ||
                (sheetAction === 'publish' && !publishedUrl.trim())
              }
              onClick={() => {
                if (sheetAction === 'request_changes') {
                  runAction(() => requestChanges(orderId, changeComment), 'Change request sent.')
                } else if (sheetAction === 'publish') {
                  runAction(
                    () => markPublished(orderId, publishedUrl, publishDateForPublish || null),
                    'Order marked published.'
                  )
                } else if (sheetAction === 'assign_copywriter') {
                  runAction(
                    () => assignCopywriter(orderId, copywriterId || null),
                    copywriterId ? 'Copywriter assigned.' : 'Copywriter unassigned.'
                  )
                } else if (sheetAction === 'edit_order') {
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
                } else if (sheetAction === 'override_status') {
                  runAction(
                    () => overrideOrderStatus(orderId, overrideStatus),
                    'Order status overridden.'
                  )
                }
              }}
            >
              {pending
                ? 'Saving…'
                : sheetAction === 'request_changes'
                  ? 'Send'
                  : sheetAction === 'publish'
                    ? 'Publish'
                    : sheetAction === 'override_status'
                      ? 'Apply'
                      : sheetAction === 'edit_order'
                        ? 'Save changes'
                        : 'Save'}
            </Button>
          </>
        }
      >
        {sheetAction === 'request_changes' && (
          <textarea
            value={changeComment}
            onChange={(event) => setChangeComment(event.target.value)}
            rows={4}
            maxLength={2000}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Describe what should be changed…"
          />
        )}
        {sheetAction === 'publish' && (
          <div className="gap-inset flex flex-col">
            <OrderSummaryBanner domain={siteDomain} status={context.status} price={price} />
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Published URL</span>
              <input
                type="url"
                value={publishedUrl}
                onChange={(event) => setPublishedUrl(event.target.value)}
                placeholder="https://example.com/post"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border px-3 text-sm"
              />
            </label>
            <label className="gap-1 text-sm">
              <span className="text-muted-foreground">Publish date</span>
              <input
                type="date"
                value={publishDateForPublish}
                onChange={(event) => setPublishDateForPublish(event.target.value)}
                className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
              />
            </label>
          </div>
        )}
        {sheetAction === 'assign_copywriter' && (
          <>
            <OrderSummaryBanner domain={siteDomain} status={context.status} price={price} />
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
          </>
        )}
        {sheetAction === 'edit_order' && (
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
        )}
        {sheetAction === 'override_status' && (
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
        )}
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </SettingsRightSheet>

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
