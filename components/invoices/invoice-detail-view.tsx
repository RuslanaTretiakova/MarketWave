'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowLeft, Download, Mail, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import {
  cancelInvoice,
  markInvoiceOverdue,
  markInvoicePaid,
  sendInvoiceEmail,
  updateInvoice,
} from '@/lib/invoices/invoice-actions'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { InvoiceDetail } from '@/lib/invoices/load-invoices'
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL } from '@/lib/orders/order-status-labels'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

function formatDateUtc(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function formatDateTimeUtc(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 16).replace('T', ' ')
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="gap-inset sm:gap-section flex flex-col sm:flex-row">
      <dt className="text-muted-foreground w-40 shrink-0 text-sm">{label}</dt>
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
  const [pending, startTransition] = useTransition()
  const canManage = role === 'admin' || role === 'manager'

  const [amount, setAmount] = useState(invoice.amount.toFixed(2))
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '')

  const isLocked = invoice.status === 'paid' || invoice.status === 'canceled'
  const dirty =
    parseFloat(amount || '0') !== invoice.amount || (dueDate || null) !== invoice.due_date

  function runAction(
    action: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string
  ) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) toast.error((res as { ok: false; message: string }).message)
      else toast.success(successMessage)
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid amount.')
      return
    }
    runAction(
      () =>
        updateInvoice(invoice.id, {
          amount: parsed,
          due_date: dueDate || null,
        }),
      'Invoice updated.'
    )
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
          title={invoice.site_domain}
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
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  ORDER_STATUS_CHIP[invoice.order_status]
                )}
                title="Order status"
              >
                Order: {ORDER_STATUS_LABEL[invoice.order_status]}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                ${invoice.amount.toFixed(2)}
              </span>
            </div>
          }
          action={
            <div className="gap-inset flex flex-wrap">
              <a
                href={`/api/invoices/${invoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border bg-background hover:bg-muted text-foreground gap-inset inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium"
              >
                <Download className="size-4" /> Download PDF
              </a>
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    runAction(
                      () => sendInvoiceEmail(invoice.id),
                      invoice.sent_at ? 'Invoice resent.' : 'Invoice sent.'
                    )
                  }
                  disabled={pending || invoice.status === 'canceled'}
                >
                  <Mail className="size-4" /> {invoice.sent_at ? 'Resend' : 'Send'} invoice
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="gap-layout grid lg:grid-cols-3">
        <Card className="p-section space-y-block lg:col-span-2">
          <h3 className="text-foreground text-base font-semibold">Invoice</h3>
          <dl className="space-y-inset">
            <DetailRow label="Domain" value={invoice.site_domain} />
            <DetailRow label="Client" value={invoice.client_name ?? '—'} />
            <DetailRow label="Email" value={invoice.client_email ?? '—'} />
            <DetailRow label="Created" value={formatDateTimeUtc(invoice.created_at)} />
            <DetailRow
              label="Billing month"
              value={invoice.billing_month ? invoice.billing_month.slice(0, 7) : '—'}
            />
            <DetailRow label="Group ID" value={invoice.invoice_group_id ?? '—'} />
            {invoice.sent_at && (
              <DetailRow label="Last sent" value={formatDateTimeUtc(invoice.sent_at)} />
            )}
            {invoice.paid_at && (
              <DetailRow label="Paid at" value={formatDateTimeUtc(invoice.paid_at)} />
            )}
            <DetailRow
              label="Order"
              value={
                <Link href={`/orders/${invoice.order_id}`} className="text-primary hover:underline">
                  Open order
                </Link>
              }
            />
            {invoice.order_published_url && (
              <DetailRow
                label="Published URL"
                value={
                  <a
                    href={invoice.order_published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary break-all hover:underline"
                  >
                    {invoice.order_published_url}
                  </a>
                }
              />
            )}
          </dl>

          {canManage && (
            <form
              onSubmit={handleSave}
              className="space-y-block mt-section border-border pt-section border-t"
            >
              <h3 className="text-foreground text-base font-semibold">Edit invoice</h3>
              {isLocked ? (
                <p className="text-muted-foreground text-sm">
                  {invoice.status === 'paid'
                    ? 'Paid invoices are read-only.'
                    : 'Canceled invoices are read-only.'}
                </p>
              ) : (
                <>
                  <div className="gap-block grid sm:grid-cols-2">
                    <label className="gap-inset flex flex-col text-sm">
                      <span className="text-foreground font-medium">Amount</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                      />
                    </label>
                    <label className="gap-inset flex flex-col text-sm">
                      <span className="text-foreground font-medium">Due date</span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
                      />
                    </label>
                  </div>
                  <Button type="submit" variant="cta" disabled={pending || !dirty}>
                    <Save className="size-4" /> Save changes
                  </Button>
                </>
              )}
            </form>
          )}
        </Card>

        {canManage && (
          <Card className="p-section space-y-block">
            <h3 className="text-foreground text-base font-semibold">Actions</h3>
            {invoice.status !== 'paid' && invoice.status !== 'canceled' && (
              <div className="gap-inset flex flex-col">
                <Button
                  type="button"
                  variant="cta"
                  onClick={() =>
                    runAction(() => markInvoicePaid(invoice.id), 'Invoice marked as paid.')
                  }
                  disabled={pending}
                >
                  Mark as paid
                </Button>
                {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      runAction(() => markInvoiceOverdue(invoice.id), 'Marked overdue.')
                    }
                    disabled={pending || invoice.status === 'overdue'}
                  >
                    Mark overdue
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => runAction(() => cancelInvoice(invoice.id), 'Invoice canceled.')}
                  disabled={pending}
                >
                  Cancel invoice
                </Button>
              </div>
            )}
            {invoice.status === 'paid' && (
              <p className="text-muted-foreground text-sm">
                Paid on {formatDateUtc(invoice.paid_at)}.
              </p>
            )}
            {invoice.status === 'canceled' && (
              <p className="text-muted-foreground text-sm">This invoice has been canceled.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
