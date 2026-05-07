'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { AssignCopywriterSelect } from '@/components/orders/assign-copywriter-select'
import { ChangeRequestsList } from '@/components/orders/change-requests-list'
import { OrderStatusActions } from '@/components/orders/order-status-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cancelInvoice, markInvoiceOverdue, markInvoicePaid } from '@/lib/invoices/invoice-actions'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import type { OrderDetail, UserRole } from '@/lib/orders/load-order-detail'
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL } from '@/lib/orders/order-status-labels'
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
      {role === 'admin' && invoice.status !== 'paid' && invoice.status !== 'canceled' && (
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
          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runAction(() => markInvoiceOverdue(invoice.id))}
              disabled={pending || invoice.status === 'overdue'}
            >
              Mark overdue
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => runAction(() => cancelInvoice(invoice.id))}
            disabled={pending}
          >
            Cancel invoice
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
}: {
  order: OrderDetail
  role: UserRole
  userId: string
  copywriterOptions?: CopywriterOption[]
}) {
  const isStaff = role === 'admin' || role === 'manager'

  return (
    <div className="space-y-layout mx-auto max-w-4xl">
      {/* Header */}
      <div className="gap-block flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            {order.site_domain}
          </h2>
          <div className="mt-inset gap-block flex items-center">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                ORDER_STATUS_CHIP[order.status]
              )}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
            <span className="text-muted-foreground text-sm tabular-nums">
              ${order.price.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <OrderStatusActions
            orderId={order.id}
            status={order.status}
            role={role}
            userId={userId}
            orderUserId={order.user_id}
            copywriterId={order.copywriter_id}
          />
        </div>
      </div>

      <div className="gap-layout grid lg:grid-cols-3">
        {/* Main info */}
        <div className="space-y-layout lg:col-span-2">
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
              <DetailRow label="Placed" value={new Date(order.created_at).toLocaleDateString()} />
              {isStaff && order.client_name && (
                <DetailRow label="Client" value={order.client_name} />
              )}
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

          {/* Change requests */}
          <Card className="p-section space-y-block">
            <h3 className="text-foreground text-base font-semibold">Change requests</h3>
            <ChangeRequestsList changeRequests={order.change_requests} role={role} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-layout">
          {/* Invoice */}
          {order.invoice && (
            <Card className="p-section">
              <InvoicePanel invoice={order.invoice} role={role} />
            </Card>
          )}

          {/* Copywriter assignment */}
          {isStaff && copywriterOptions && (
            <Card className="p-section space-y-block">
              <h3 className="text-foreground text-base font-semibold">Assignment</h3>
              <AssignCopywriterSelect
                orderId={order.id}
                currentCopywriterId={order.copywriter_id}
                copywriterOptions={copywriterOptions}
              />
              {order.copywriter_name && (
                <p className="text-muted-foreground text-sm">
                  Assigned to{' '}
                  <span className="text-foreground font-medium">{order.copywriter_name}</span>
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
