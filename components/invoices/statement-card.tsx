'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp, Download, MailCheck, Send } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { markInvoicePaid, sendInvoiceEmail } from '@/lib/invoices/invoice-actions'
import type { InvoiceListRow } from '@/lib/invoices/load-invoices'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

// NOTE: "Download PDFs" loops the existing per-invoice route. A consolidated
// single-PDF statement is a future task (would need a new API route).

type Role = Database['public']['Enums']['user_role']

function aggregateStatus(invoices: InvoiceListRow[]): {
  label: string
  className: string
} {
  const statuses = new Set(invoices.map((i) => i.status))
  if (statuses.size === 1) {
    const only = invoices[0].status
    if (only === 'paid') return { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' }
    if (only === 'sent') return { label: 'Sent', className: 'bg-sky-100 text-sky-800' }
    if (only === 'draft') return { label: 'Draft', className: 'bg-muted text-muted-foreground' }
    if (only === 'canceled')
      return { label: 'Canceled', className: 'bg-muted text-muted-foreground' }
  }
  if (statuses.has('draft') && statuses.has('sent')) {
    return { label: 'Partially sent', className: 'bg-amber-100 text-amber-800' }
  }
  return { label: 'Mixed', className: 'bg-muted text-muted-foreground' }
}

function formatStatementTitle(billingMonth: string | null): string {
  if (!billingMonth) return 'Unscheduled'
  const d = new Date(billingMonth)
  if (Number.isNaN(d.getTime())) return 'Unscheduled'
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(d)
}

export function StatementCard({
  invoices,
  role,
  defaultExpanded = false,
}: {
  invoices: InvoiceListRow[]
  role: Role
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [pending, startTransition] = useTransition()

  const isStaff = role === 'admin' || role === 'manager'
  const total = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const title = formatStatementTitle(invoices[0]?.billing_month ?? null)
  const badge = aggregateStatus(invoices)
  const clientName = invoices[0]?.client_name ?? null
  const clientEmail = invoices[0]?.client_email ?? null

  const draftIds = invoices.filter((i) => i.status === 'draft').map((i) => i.id)
  const sentIds = invoices.filter((i) => i.status === 'sent').map((i) => i.id)

  function handleSendStatement() {
    if (draftIds.length === 0) return
    startTransition(async () => {
      let sent = 0
      for (const id of draftIds) {
        const res = await sendInvoiceEmail(id)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        sent += 1
      }
      toast.success(`Sent ${sent} invoice${sent === 1 ? '' : 's'}.`)
    })
  }

  function handleMarkPaid() {
    if (sentIds.length === 0) return
    startTransition(async () => {
      let marked = 0
      for (const id of sentIds) {
        const res = await markInvoicePaid(id)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        marked += 1
      }
      toast.success(`Marked ${marked} invoice${marked === 1 ? '' : 's'} paid.`)
    })
  }

  function handleDownloadPdfs() {
    if (invoices.length === 0) return
    toast.message(`Opening ${invoices.length} PDF tab(s) — allow popups if blocked.`)
    for (const inv of invoices) {
      window.open(`/api/invoices/${inv.id}/pdf`, '_blank')
    }
  }

  return (
    <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
      <header className="px-section py-block gap-inset flex flex-wrap items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="gap-inset flex min-w-0 flex-1 items-center text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="text-muted-foreground size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
          )}
          <div className="gap-inset flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-foreground text-base font-semibold">{title}</h3>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
            {isStaff && clientName ? (
              <p className="text-muted-foreground text-xs">
                {clientName}
                {clientEmail ? ` · ${clientEmail}` : ''}
              </p>
            ) : null}
          </div>
        </button>

        <div className="gap-inset flex flex-wrap items-center justify-end">
          <div className="text-right">
            <p className="text-muted-foreground text-xs">
              {invoices.length} order{invoices.length === 1 ? '' : 's'}
            </p>
            <p className="text-foreground text-base font-semibold tabular-nums">
              ${total.toFixed(2)}
            </p>
          </div>
          <div className="gap-inset flex flex-wrap items-center">
            {isStaff && draftIds.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={handleSendStatement}
              >
                <Send className="size-3.5" aria-hidden />
                Send Statement
              </Button>
            ) : null}
            {isStaff && sentIds.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={handleMarkPaid}
              >
                <MailCheck className="size-3.5" aria-hidden />
                Mark Paid
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdfs}>
              <Download className="size-3.5" aria-hidden />
              Download PDFs
            </Button>
          </div>
        </div>
      </header>

      {expanded ? (
        <div className="border-border/60 overflow-x-auto border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Site
                </th>
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Invoice #
                </th>
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Status
                </th>
                <th className="text-muted-foreground px-section py-block text-right font-medium">
                  Amount
                </th>
                <th className="text-muted-foreground px-section py-block text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr
                  key={row.id}
                  className="border-border hover:bg-muted/30 border-b last:border-b-0"
                >
                  <td className="px-section py-block">
                    <Link
                      href={`/invoices/${row.id}`}
                      className="text-foreground font-medium hover:underline"
                    >
                      {row.site_domain}
                    </Link>
                  </td>
                  <td className="px-section py-block font-mono text-sm">
                    {row.invoice_number ?? '—'}
                  </td>
                  <td className="px-section py-block">
                    <InvoiceStatusBadge status={row.status} />
                  </td>
                  <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                    ${row.amount.toFixed(2)}
                  </td>
                  <td className="px-section py-block text-right">
                    <Link
                      href={`/invoices/${row.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
