'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createOrderChatRoom } from '@/lib/chat/chat-actions'

import { OrderActionsMenu } from '@/components/orders/order-actions-menu'
import { ChangeRequestsList } from '@/components/orders/change-requests-list'
import { ClientContentReviewActions } from '@/components/orders/client-content-review-actions'
import { CopywriterContentEditor } from '@/components/orders/copywriter-content-editor'
import { OrderContentViewer } from '@/components/orders/order-content-viewer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { markInvoicePaid } from '@/lib/invoices/invoice-actions'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import type { OrderDetail, UserRole } from '@/lib/orders/load-order-detail'
import {
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  orderStatusLabelForRole,
} from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="gap-inset sm:gap-section flex flex-col sm:flex-row">
      <dt className="text-muted-foreground w-40 shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  )
}

function InvoicePanel({
  invoice,
  role,
}: {
  invoice: NonNullable<OrderDetail['invoice']>
  role: UserRole
}) {
  const [pending, startTransition] = useTransition()

  function runAction(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) toast.error((res as { ok: false; message: string }).message)
      else toast.success('Invoice updated.')
    })
  }

  return (
    <div className="space-y-block">
      <div className="gap-block flex items-center">
        <h3 className="text-foreground text-base font-semibold">Invoice</h3>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            INVOICE_STATUS_CHIP[invoice.status]
          )}
        >
          {INVOICE_STATUS_LABEL[invoice.status]}
        </span>
      </div>
      <dl className="space-y-inset">
        <DetailRow label="Amount" value={`$${invoice.amount.toFixed(2)}`} />
        <DetailRow label="Due date" value={invoice.due_date ?? '—'} />
        {invoice.paid_at && (
          <DetailRow label="Paid at" value={new Date(invoice.paid_at).toLocaleString()} />
        )}
      </dl>
      {(role === 'admin' || role === 'manager') && invoice.status === 'sent' && (
        <div className="gap-inset flex flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="cta"
            onClick={() => runAction(() => markInvoicePaid(invoice.id))}
            disabled={pending}
          >
            Mark as paid
          </Button>
        </div>
      )}
    </div>
  )
}

export function OrderDetailView({
  order,
  role,
  userId,
  copywriterOptions,
  chatRoomId: initialChatRoomId,
}: {
  order: OrderDetail
  role: UserRole
  userId: string
  copywriterOptions?: CopywriterOption[]
  chatRoomId?: string | null
}) {
  const router = useRouter()
  const [chatRoomId, setChatRoomId] = useState(initialChatRoomId ?? null)
  const [chatPending, startChatTransition] = useTransition()
  const isStaff = role === 'admin' || role === 'manager'
  const isClientOwner = role === 'client' && userId === order.user_id
  const isAssignedCopywriter = role === 'copywriter' && userId === order.copywriter_id
  const canEditContent =
    isAssignedCopywriter && (order.status === 'in_progress' || order.status === 'needs_changes')
  const submittedVersions = order.content.submitted

  return (
    <div className="gap-layout mx-auto flex w-full max-w-4xl flex-col">
      <PageHeader
        title={order.site_domain}
        meta={
          <div className="gap-block flex items-center">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                ORDER_STATUS_CHIP[order.status]
              )}
            >
              {orderStatusLabelForRole(order.status, role)}
            </span>
            <span className="text-muted-foreground text-sm tabular-nums">
              ${order.price.toFixed(2)}
            </span>
          </div>
        }
        action={
          <div className="gap-inset flex flex-wrap">
            {chatRoomId ? (
              <Link
                href={`/chats/${chatRoomId}`}
                className="border-border bg-background hover:bg-muted text-foreground gap-inset px-block inline-flex h-10 items-center rounded-md border text-sm font-medium"
              >
                <MessageSquare className="size-4" /> Open chat
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={chatPending}
                onClick={() =>
                  startChatTransition(async () => {
                    const res = await createOrderChatRoom(order.id)
                    if (!res.ok) {
                      toast.error(res.message)
                      return
                    }
                    setChatRoomId(res.roomId)
                    router.push(`/chats/${res.roomId}`)
                  })
                }
              >
                <MessageSquare className="size-4" /> Start chat
              </Button>
            )}
            <OrderActionsMenu
              context={{
                role,
                status: order.status,
                userId,
                orderUserId: order.user_id,
                copywriterId: order.copywriter_id,
                invoiceId: order.invoice?.id ?? null,
                invoiceStatus: order.invoice?.status ?? null,
              }}
              orderId={order.id}
              detailHref={`/orders/${order.id}`}
              invoiceHref={order.invoice ? `/invoices/${order.invoice.id}` : undefined}
              copywriterOptions={copywriterOptions}
              initialPublishDate={order.publish_date}
              initialPublishMonth={order.publish_month}
              initialAnchorText={order.anchor_text}
              initialTargetUrl={order.target_url}
              initialClientNotes={order.client_notes}
              siteDomain={order.site_domain}
              price={order.price}
              triggerVariant="icon"
            />
          </div>
        }
      />

      <div className="gap-layout grid">
        {/* Order summary */}
        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Order details</h3>
          <dl className="space-y-inset">
            <DetailRow label="Domain" value={order.site_domain} />
            <DetailRow label="Category" value={order.site_category} />
            <DetailRow label="DR" value={order.site_dr !== null ? String(order.site_dr) : null} />
            <DetailRow
              label="Link type"
              value={<span className="capitalize">{order.site_link_type}</span>}
            />
            <DetailRow label="Countries" value={order.site_countries.join(', ') || null} />
            <DetailRow label="Languages" value={order.site_languages.join(', ') || null} />
            <DetailRow label="Publish date" value={order.publish_date ?? '—'} />
            <DetailRow
              label="Publication month"
              value={order.publish_month ? order.publish_month.slice(0, 7) : '—'}
            />
            <DetailRow label="Anchor text" value={order.anchor_text} />
            <DetailRow
              label="Target URL"
              value={
                order.target_url ? (
                  <a
                    href={order.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary break-all hover:underline"
                  >
                    {order.target_url}
                  </a>
                ) : null
              }
            />
            <DetailRow label="Client notes" value={order.client_notes} />
            <DetailRow
              label="Published URL"
              value={
                order.published_url ? (
                  <a
                    href={order.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary break-all hover:underline"
                  >
                    {order.published_url}
                  </a>
                ) : null
              }
            />
            <DetailRow label="Placed" value={new Date(order.created_at).toLocaleDateString()} />
            <DetailRow
              label="Assigned at"
              value={order.assigned_at ? new Date(order.assigned_at).toLocaleString() : null}
            />
            <DetailRow
              label="Content submitted at"
              value={
                order.content_submitted_at
                  ? new Date(order.content_submitted_at).toLocaleString()
                  : null
              }
            />
            <DetailRow
              label="Approved at"
              value={order.approved_at ? new Date(order.approved_at).toLocaleString() : null}
            />
            <DetailRow
              label="Published at"
              value={order.published_at ? new Date(order.published_at).toLocaleString() : null}
            />
            <DetailRow
              label="Completed at"
              value={order.completed_at ? new Date(order.completed_at).toLocaleString() : null}
            />
            <DetailRow
              label="Canceled at"
              value={order.canceled_at ? new Date(order.canceled_at).toLocaleString() : null}
            />
            {isStaff && order.client_name && <DetailRow label="Client" value={order.client_name} />}
          </dl>
        </Card>

        {/* Site snapshot */}
        {(order.site_description || order.site_requirements || order.site_keywords_relevance) && (
          <Card className="p-section space-y-block">
            <h3 className="text-foreground text-base font-semibold">Site details</h3>
            <dl className="space-y-inset">
              <DetailRow label="Description" value={order.site_description} />
              <DetailRow label="Requirements" value={order.site_requirements} />
              <DetailRow label="Keywords" value={order.site_keywords_relevance} />
              {order.site_organic_keywords_count !== null && (
                <DetailRow
                  label="Organic keywords"
                  value={order.site_organic_keywords_count.toLocaleString()}
                />
              )}
              {order.site_organic_traffic_count !== null && (
                <DetailRow
                  label="Organic traffic"
                  value={order.site_organic_traffic_count.toLocaleString()}
                />
              )}
              {isStaff && order.site_contact_info && (
                <DetailRow label="Contact info" value={order.site_contact_info} />
              )}
            </dl>
          </Card>
        )}

        {/* Article content */}
        <Card className="p-section space-y-block">
          <div className="gap-block flex flex-wrap items-center justify-between">
            <h3 className="text-foreground text-base font-semibold">Article content</h3>
            {submittedVersions.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {submittedVersions.length}{' '}
                {submittedVersions.length === 1 ? 'submission' : 'submissions'}
              </span>
            )}
          </div>

          {isClientOwner && order.status === 'content_sent' ? (
            <ClientContentReviewActions orderId={order.id} />
          ) : null}

          {canEditContent ? (
            <>
              <CopywriterContentEditor
                orderId={order.id}
                status={order.status}
                initialDraft={order.content.draft}
                latestSubmitted={submittedVersions[0] ?? null}
                openChangeRequests={order.change_requests}
              />
              {submittedVersions.length > 0 && (
                <div className="border-border pt-block space-y-block border-t">
                  <h4 className="text-foreground text-sm font-semibold">Previously submitted</h4>
                  <OrderContentViewer versions={submittedVersions} />
                </div>
              )}
            </>
          ) : submittedVersions.length > 0 ? (
            <OrderContentViewer versions={submittedVersions} />
          ) : isAssignedCopywriter ? (
            <p className="text-muted-foreground text-sm italic">
              Content editing opens once the order moves to In progress.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Copywriter has not submitted content yet.
            </p>
          )}
        </Card>

        {/* Change requests */}
        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Change requests</h3>
          <ChangeRequestsList changeRequests={order.change_requests} role={role} />
        </Card>

        {order.invoice && (
          <Card className="p-section">
            <InvoicePanel invoice={order.invoice} role={role} />
          </Card>
        )}

        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Status history</h3>
          {order.status_history.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              No status transitions recorded yet.
            </p>
          ) : (
            <div className="space-y-inset max-h-54 overflow-y-auto">
              {order.status_history.map((item) => (
                <div key={item.id} className="border-border rounded-md border p-3 text-sm">
                  <p className="text-foreground font-medium">
                    {ORDER_STATUS_LABEL[item.from_status]} {'->'}{' '}
                    {ORDER_STATUS_LABEL[item.to_status]}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                  {item.comment ? (
                    <p className="text-muted-foreground mt-1">{item.comment}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
