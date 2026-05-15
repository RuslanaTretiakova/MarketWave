'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { generateMonthlyInvoices } from '@/lib/invoices/invoice-actions'

export function GenerateMonthlyInvoices() {
  const [pending, startTransition] = useTransition()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })

  return (
    <div className="border-border bg-muted/20 flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">Billing month</span>
        <input
          type="month"
          className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={pending}
        />
      </label>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await generateMonthlyInvoices(month)
            if (!res.ok) toast.error(res.message)
            else
              toast.success(
                res.count > 0
                  ? `Generated ${res.count} invoice(s) for ${month}.`
                  : `No new invoices to generate for ${month}.`
              )
          })
        }
      >
        {pending ? 'Generating…' : 'Generate monthly invoices'}
      </Button>
    </div>
  )
}
