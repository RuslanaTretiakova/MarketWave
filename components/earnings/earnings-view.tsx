'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { markEarningPaid } from '@/lib/earnings/earnings-actions'
import type { SourcerEarningsSummary } from '@/lib/earnings/load-earnings'

function money(v: number): string {
  return `$${v.toFixed(2)}`
}

export function EarningsView({
  title,
  summary,
  canManage,
}: {
  title: string
  summary: SourcerEarningsSummary
  canManage?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [referenceById, setReferenceById] = useState<Record<string, string>>({})

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Earnings are calculated from published/completed orders for sourcer-submitted sites.
        </p>
      </div>

      <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Total earnings</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.totalEarnings)}
          </p>
        </Card>
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">This month</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.monthlyEarnings)}
          </p>
        </Card>
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Paid commissions</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.paidEarnings)}
          </p>
        </Card>
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Unpaid commissions</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.unpaidEarnings)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Month
                </th>
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Domain
                </th>
                <th className="text-muted-foreground px-section py-block text-right font-medium">
                  Amount
                </th>
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Status
                </th>
                <th className="text-muted-foreground px-section py-block text-left font-medium">
                  Reference
                </th>
                {canManage ? (
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Action
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {summary.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 6 : 5}
                    className="text-muted-foreground px-section py-section text-center"
                  >
                    No earnings yet.
                  </td>
                </tr>
              ) : (
                summary.rows.map((row) => (
                  <tr key={row.id} className="border-border border-b last:border-b-0">
                    <td className="px-section py-block">{row.earning_month.slice(0, 7)}</td>
                    <td className="px-section py-block">
                      <Link
                        href={`/orders/${row.order_id}`}
                        className="text-primary hover:underline"
                      >
                        {row.site_domain ?? 'Order'}
                      </Link>
                    </td>
                    <td className="px-section py-block text-right font-semibold tabular-nums">
                      {money(row.earned_amount)}
                    </td>
                    <td className="px-section py-block capitalize">{row.payout_status}</td>
                    <td className="text-muted-foreground px-section py-block">
                      {row.payout_reference ?? '—'}
                    </td>
                    {canManage ? (
                      <td className="px-section py-block">
                        {row.payout_status === 'paid' ? (
                          <span className="text-muted-foreground text-xs">Paid</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              className="border-border bg-background text-foreground h-8 rounded-md border px-2 text-xs"
                              placeholder="Reference"
                              value={referenceById[row.id] ?? ''}
                              onChange={(e) =>
                                setReferenceById((prev) => ({ ...prev, [row.id]: e.target.value }))
                              }
                              disabled={pending}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() =>
                                startTransition(async () => {
                                  const res = await markEarningPaid(
                                    row.id,
                                    referenceById[row.id] ?? null
                                  )
                                  if (!res.ok) toast.error(res.message)
                                  else toast.success('Payout marked as paid.')
                                })
                              }
                            >
                              Mark paid
                            </Button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
