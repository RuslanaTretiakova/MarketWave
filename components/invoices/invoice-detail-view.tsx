'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft, Download, Mail, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { EditInvoiceOrders } from '@/components/invoices/edit-invoice-orders'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MenuActionDialog } from '@/components/ui/menu-action-dialog'
import { PageHeader } from '@/components/ui/page-header'
import { markInvoicePaid, sendInvoice } from '@/lib/invoices/invoice-actions'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { InvoiceDetail } from '@/lib/invoices/load-invoices'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

function formatDateUtc(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="gap-inset sm:gap-section flex flex-col sm:flex-row">
      <dt className="text-muted-foreground w-44 shrink-0 text-sm">{label}</dt>
      <dd className="text-foreground text-sm">{value}</dd>
    </div>
  )
}

export function InvoiceDetailView({
  invoice,
  role,
}: {
  invoice: InvoiceDetail
  role: Database['public']['Enums']['user_role']
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const canManage = role === 'admin' || role === 'manager'
  const [editOpen, setEditOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)

  const isDraft = invoice.status === 'draft'
  const isSent = invoice.status === 'sent'
  const canEdit = canManage && isDraft
  const canSend = canManage && isDraft
  const canMarkPaid = canManage && isSent

  const invoiceLabel = invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()

  function runAction(
    action: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) toast.error((res as { ok: false; message: string }).message)
      else {
        toast.success(successMessage)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-layout mx-auto max-w-4xl">
      <div className="gap-block flex flex-col">
        <Link
          href="/invoices"
          className="text-muted-foreground gap-inset hover:text-foreground inline-flex items-center text-sm font-medium"
        >
          <ArrowLeft className="size-4" /> Back to invoices
        </Link>
        <PageHeader
          title={`Invoice ${invoiceLabel}`}
          meta={
            <div className="gap-block flex items-center">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  INVOICE_STATUS_CHIP[invoice.status]
                )}
              >
                {INVOICE_STATUS_LABEL[invoice.status]}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {fmtMoney(invoice.total)}
              </span>
            </div>
          }
          action={
            <div className="gap-inset flex flex-wrap">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border bg-background hover:bg-muted text-foreground gap-inset px-block inline-flex h-10 items-center rounded-md border text-sm font-medium"
              >
                <Download className="size-4" /> Download PDF
              </a>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  disabled={pending}
                >
                  <Pencil className="size-4" /> Edit orders
                </Button>
              )}
              {canSend && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSendOpen(true)}
                  disabled={pending}
                >
                  <Mail className="size-4" /> Send invoice
                </Button>
              )}
              {canMarkPaid && (
                <Button
                  type="button"
                  variant="cta"
                  onClick={() => setMarkPaidOpen(true)}
                  disabled={pending}
                >
                  Mark as paid
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="gap-layout grid">
        {/* Invoice header */}
        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Invoice details</h3>
          <dl className="space-y-inset">
            <DetailRow label="Invoice number" value={invoiceLabel} />
            <DetailRow label="Client" value={invoice.client_name ?? '—'} />
            {invoice.client_email && <DetailRow label="Email" value={invoice.client_email} />}
            <DetailRow label="Billing month" value={invoice.billing_period_label} />
            <DetailRow label="Status" value={INVOICE_STATUS_LABEL[invoice.status]} />
            {invoice.due_date && <DetailRow label="Due date" value={invoice.due_date} />}
            {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
          </dl>
        </Card>

        {/* Timeline */}
        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Timeline</h3>
          <dl className="space-y-inset">
            <DetailRow label="Created" value={formatDateUtc(invoice.created_at)} />
            {invoice.generated_at && (
              <DetailRow label="Generated" value={formatDateUtc(invoice.generated_at)} />
            )}
            {invoice.sent_at && (
              <DetailRow
                label="Sent"
                value={
                  invoice.sent_by_name
                    ? `${formatDateUtc(invoice.sent_at)} by ${invoice.sent_by_name}`
                    : formatDateUtc(invoice.sent_at)
                }
              />
            )}
            {invoice.paid_at && (
              <DetailRow
                label="Paid"
                value={
                  invoice.paid_by_name
                    ? `${formatDateUtc(invoice.paid_at)} by ${invoice.paid_by_name}`
                    : formatDateUtc(invoice.paid_at)
                }
              />
            )}
          </dl>
        </Card>

        {/* Invoice items */}
        <Card className="overflow-hidden p-0">
          <div className="px-section py-block border-border border-b">
            <h3 className="text-foreground text-base font-semibold">
              Orders ({invoice.items.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Site
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Order
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Publish date
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-border border-b last:border-b-0">
                    <td className="px-section py-block">{item.site_domain ?? '—'}</td>
                    <td className="px-section py-block">
                      <Link
                        href={`/orders/${item.order_id}`}
                        className="text-primary font-mono text-xs hover:underline"
                      >
                        {item.order_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-section py-block">
                      {item.order_publish_date ?? '—'}
                    </td>
                    <td className="px-section py-block text-right font-semibold tabular-nums">
                      {fmtMoney(item.amount)}
                    </td>
                  </tr>
                ))}
                {invoice.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-muted-foreground px-section py-block text-center text-sm"
                    >
                      No orders attached yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-section py-block border-border border-t">
            <div className="ml-auto w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{fmtMoney(invoice.subtotal)}</span>
              </div>
              {invoice.adjustments !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustments</span>
                  <span className="tabular-nums">{fmtMoney(invoice.adjustments)}</span>
                </div>
              )}
              <div className="border-border flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{fmtMoney(invoice.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit orders sheet */}
      {canEdit && (
        <EditInvoiceOrders invoice={invoice} open={editOpen} onOpenChange={setEditOpen} />
      )}

      <MenuActionDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="Send invoice"
        description={`This will mark invoice ${invoiceLabel} as sent and notify the client.`}
        confirmLabel={pending ? 'Sending…' : 'Send invoice'}
        busy={pending}
        onConfirm={() => {
          runAction(() => sendInvoice(invoice.id), 'Invoice sent.')
          setSendOpen(false)
        }}
      />

      <MenuActionDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark invoice as paid"
        description={`This will mark invoice ${invoiceLabel} as paid and complete all attached published orders.`}
        confirmLabel={pending ? 'Marking…' : 'Mark as paid'}
        busy={pending}
        onConfirm={() => {
          runAction(() => markInvoicePaid(invoice.id), 'Invoice marked as paid.')
          setMarkPaidOpen(false)
        }}
      />
    </div>
  )
}
