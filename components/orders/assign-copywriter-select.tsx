'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { assignCopywriter } from '@/lib/orders/assign-copywriter-action'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'

export function AssignCopywriterButton({
  orderId,
  currentCopywriterId,
  currentCopywriterName,
  copywriterOptions,
}: {
  orderId: string
  currentCopywriterId: string | null
  currentCopywriterName: string | null
  copywriterOptions: CopywriterOption[]
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>(currentCopywriterId ?? '')
  const [pending, startTransition] = useTransition()

  const isReassign = currentCopywriterId !== null

  function handleSave() {
    const next = selected || null
    if (next === currentCopywriterId) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      const res = await assignCopywriter(orderId, next)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      if (!next) toast.success('Copywriter unassigned.')
      else if (isReassign) toast.success('Copywriter reassigned.')
      else toast.success('Copywriter assigned.')
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setSelected(currentCopywriterId ?? '')
      }}
    >
      <div className="space-y-inset">
        <label className="text-muted-foreground text-xs font-medium">Copywriter</label>
        {isReassign ? (
          <div className="gap-inset flex flex-col">
            <p className="text-foreground text-sm">
              Assigned to <span className="font-medium">{currentCopywriterName ?? 'Unknown'}</span>
            </p>
            <DialogTrigger render={<Button variant="outline" size="sm" className="w-fit" />}>
              Reassign
            </DialogTrigger>
          </div>
        ) : (
          <DialogTrigger render={<Button variant="cta" size="sm" className="w-full" />}>
            Assign copywriter
          </DialogTrigger>
        )}
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isReassign ? 'Reassign copywriter' : 'Assign copywriter'}</DialogTitle>
          <DialogDescription>
            {isReassign
              ? 'Pick a different copywriter for this order. Both copywriters and the client will be notified.'
              : 'Choose a copywriter for this order.'}
          </DialogDescription>
        </DialogHeader>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending}
          className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 text-sm disabled:opacity-50"
        >
          <option value="">{isReassign ? 'Unassign' : 'Unassigned'}</option>
          {copywriterOptions.map((cw) => (
            <option key={cw.id} value={cw.id}>
              {cw.full_name ?? cw.email ?? cw.id}
            </option>
          ))}
        </select>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
          <Button variant="cta" onClick={handleSave} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
