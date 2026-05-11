'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowLeft, Download, Mail, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MenuActionDialog } from '@/components/ui/menu-action-dialog'
import { PageHeader } from '@/components/ui/page-header'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { markInvoicePaid, sendInvoiceEmail, updateInvoice } from '@/lib/invoices/invoice-actions'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { InvoiceDetail } from '@/lib/invoices/load-invoices'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

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
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '')
  const [billingMonth, setBillingMonth] = useState(
    invoice.billing_month ? invoice.billing_month.slice(0, 7) : ''
  )
  const [itemAmounts, setItemAmounts] = useState<Record<string, string>>(
    Object.fromEntries(invoice.items.map((item) => [item.id, item.amount.toFixed(2)]))
  )

  const canEdit = canManage && invoice.status === 'draft'
  const canSend = canManage && invoice.status === 'draft'
  const canMarkPaid = canManage && invoice.status === 'sent'

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

  function handleSaveInvoice() {
    const items = invoice.items.map((item) => {
      const parsed = parseFloat(itemAmounts[item.id] ?? '')
      return { id: item.id, parsed }
    })
    if (items.some((it) => Number.isNaN(it.parsed) || it.parsed < 0)) {
      toast.error('Each item amount must be a valid non-negative number.')
      return
    }
    runAction(
      () =>
        updateInvoice(invoice.id, {
          billing_month: billingMonth || null,
          due_date: dueDate || null,
          items: items.map((it) => ({ id: it.id, amount: it.parsed })),
        }),
      'Invoice updated.'
    )
    setIsEditOpen(false)
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
          title={`Invoice ${invoice.id.slice(0, 8).toUpperCase()}`}
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
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  disabled={pending}
                >
                  <Save className="size-4" /> Edit
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
        <Card className="p-section space-y-block">
          <h3 className="text-foreground text-base font-semibold">Invoice header</h3>
          <dl className="space-y-inset">
            <DetailRow label="Client" value={invoice.client_name ?? '—'} />
            <DetailRow label="Billing period" value={invoice.billing_period_label} />
            <DetailRow label="Status" value={INVOICE_STATUS_LABEL[invoice.status]} />
            <DetailRow label="Email" value={invoice.client_email ?? '—'} />
            <DetailRow label="Site" value={invoice.site_domain} />
            <DetailRow label="Created" value={formatDateTimeUtc(invoice.created_at)} />
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
        </Card>

        <Card className="overflow-hidden p-0">
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
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-border border-b last:border-b-0">
                    <td className="px-section py-block">{item.site_domain}</td>
                    <td className="px-section py-block">
                      <Link
                        href={`/orders/${item.order_id}`}
                        className="text-primary hover:underline"
                      >
                        {item.order_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-section py-block text-right font-semibold tabular-nums">
                      ${item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit draft invoice</SheetTitle>
            <SheetDescription>
              Update billing period, due date, and line item amounts.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-block px-4">
            <label className="gap-inset flex flex-col text-sm">
              <span className="text-foreground font-medium">Billing period</span>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
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
            <div className="space-y-inset">
              <p className="text-foreground text-sm font-medium">Invoice items</p>
              {invoice.items.map((item) => (
                <label
                  key={item.id}
                  className="gap-inset flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{item.site_domain}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemAmounts[item.id] ?? ''}
                    onChange={(e) =>
                      setItemAmounts((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="border-border bg-background text-foreground h-9 w-32 rounded-md border px-3 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" variant="cta" onClick={handleSaveInvoice} disabled={pending}>
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MenuActionDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        title="Send invoice"
        description="This will mark the draft invoice as sent."
        confirmLabel={pending ? 'Sending…' : 'Send invoice'}
        busy={pending}
        onConfirm={() => {
          runAction(() => sendInvoiceEmail(invoice.id), 'Invoice sent.')
          setSendOpen(false)
        }}
      />

      <MenuActionDialog
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        title="Mark invoice as paid"
        description="This will mark the invoice as paid and complete linked orders via trigger."
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
