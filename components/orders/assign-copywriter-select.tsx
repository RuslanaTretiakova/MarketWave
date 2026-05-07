'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { assignCopywriter } from '@/lib/orders/assign-copywriter-action'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'

export function AssignCopywriterSelect({
  orderId,
  currentCopywriterId,
  copywriterOptions,
}: {
  orderId: string
  currentCopywriterId: string | null
  copywriterOptions: CopywriterOption[]
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null
    startTransition(async () => {
      const res = await assignCopywriter(orderId, value)
      if (!res.ok) toast.error(res.message)
      else toast.success(value ? 'Copywriter assigned.' : 'Copywriter unassigned.')
    })
  }

  return (
    <div className="space-y-inset">
      <label className="text-muted-foreground text-xs font-medium">Copywriter</label>
      <select
        value={currentCopywriterId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="border-border bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {copywriterOptions.map((cw) => (
          <option key={cw.id} value={cw.id}>
            {cw.full_name ?? cw.email ?? cw.id}
          </option>
        ))}
      </select>
    </div>
  )
}
