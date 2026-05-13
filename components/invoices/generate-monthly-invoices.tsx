'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { generateMonthlyInvoiceGroups } from '@/lib/invoices/invoice-actions'

export function GenerateMonthlyInvoices() {
  const [pending, startTransition] = useTransition()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  return (
    <div className="border-border bg-muted/20 flex flex-wrap items-end gap-2 rounded-lg border p-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground text-xs">Statement month</span>
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
            const res = await generateMonthlyInvoiceGroups(month)
            if (!res.ok) toast.error(res.message)
            else toast.success(`Built statement covering ${res.grouped} invoice(s) for ${month}.`)
          })
        }
      >
        {pending ? 'Generating…' : 'Generate Monthly Statements'}
      </Button>
    </div>
  )
}
