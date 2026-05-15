'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { editInvoiceOrders } from '@/lib/invoices/invoice-actions'
import type { InvoiceDetail, InvoiceItem } from '@/lib/invoices/load-invoices'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type AvailableOrder = {
  id: string
  site_domain: string | null
  price: number
  publish_date: string | null
}

function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`
}

function EditInvoiceOrdersInner({
  invoice,
  onClose,
}: {
  invoice: InvoiceDetail
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [items, setItems] = useState<InvoiceItem[]>(invoice.items)
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([])
  const [addedOrderIds, setAddedOrderIds] = useState<string[]>([])
  const [adjustments, setAdjustments] = useState(String(invoice.adjustments))
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '')
  const [notes, setNotes] = useState(invoice.notes ?? '')
  const [search, setSearch] = useState('')
  const [available, setAvailable] = useState<AvailableOrder[]>([])
  const [searching, setSearching] = useState(false)

  const searchOrders = useCallback(
    async (query: string) => {
      setSearching(true)
      const supabase = createClient()
      let q = supabase
        .from('orders')
        .select('id, site_domain, price, publish_date')
        .eq('user_id', invoice.client_id)
        .eq('status', 'published')
        .limit(20)

      if (query.trim()) {
        q = q.ilike('site_domain', `%${query.trim()}%`)
      }

      const { data } = await q.order('publish_date', { ascending: false })
      const attached = new Set([...items.map((it) => it.order_id), ...addedOrderIds])
      setAvailable(
        (data ?? [])
          .filter((o) => !attached.has(o.id))
          .map((o) => ({
            id: o.id,
            site_domain: o.site_domain,
            price: o.price,
            publish_date: o.publish_date,
          }))
      )
      setSearching(false)
    },
    [invoice.client_id, items, addedOrderIds]
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      void searchOrders(search)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search, searchOrders])

  function removeItem(item: InvoiceItem) {
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setRemovedItemIds((prev) => [...prev, item.id])
    setAvailable((prev) => [
      ...prev,
      {
        id: item.order_id,
        site_domain: item.site_domain,
        price: item.order_price,
        publish_date: item.order_publish_date,
      },
    ])
  }

  function addOrder(order: AvailableOrder) {
    const newItem: InvoiceItem = {
      id: `pending:${order.id}`,
      order_id: order.id,
      site_domain: order.site_domain,
      description: null,
      amount: order.price,
      order_status: 'published',
      order_published_url: null,
      order_publish_date: order.publish_date,
      order_price: order.price,
    }
    setItems((prev) => [...prev, newItem])
    setAddedOrderIds((prev) => [...prev, order.id])
    setAvailable((prev) => prev.filter((o) => o.id !== order.id))
  }

  const parsedAdj = parseFloat(adjustments)
  const subtotal = items.reduce((sum, it) => sum + it.amount, 0)
  const adjValue = Number.isFinite(parsedAdj) ? parsedAdj : 0
  const total = subtotal + adjValue

  function handleSave() {
    if (!Number.isFinite(parsedAdj)) {
      toast.error('Adjustments must be a valid number.')
      return
    }
    if (total < 0) {
      toast.error('Total cannot be negative.')
      return
    }

    startTransition(async () => {
      const res = await editInvoiceOrders(invoice.id, {
        addOrderIds: addedOrderIds.length > 0 ? addedOrderIds : undefined,
        removeItemIds: removedItemIds.length > 0 ? removedItemIds : undefined,
        adjustments: parsedAdj,
        due_date: dueDate || null,
        notes: notes || null,
      })
      if (!res.ok) {
        toast.error(res.message)
      } else {
        toast.success('Invoice updated.')
        onClose()
      }
    })
  }

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4">
        <SheetTitle>Edit invoice orders</SheetTitle>
        <SheetDescription>
          Add or remove published orders. Changes apply to draft invoices only.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4">
        {/* Current items */}
        <div className="space-y-2">
          <p className="text-foreground text-sm font-medium">Attached orders ({items.length})</p>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders attached.</p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">
                      {item.site_domain ?? 'Unknown site'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.order_publish_date ?? '—'} · {fmtMoney(item.amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="text-muted-foreground hover:text-destructive ml-2 shrink-0 rounded p-1"
                    aria-label={`Remove ${item.site_domain}`}
                  >
                    <Minus className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add orders */}
        <div className="space-y-2">
          <p className="text-foreground text-sm font-medium">Add published orders</p>
          <div className="border-border relative rounded-lg border">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <input
              type="text"
              placeholder="Search by site domain…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg py-2 pr-3 pl-9 text-sm outline-none"
            />
          </div>
          {searching ? (
            <p className="text-muted-foreground text-xs">Searching…</p>
          ) : available.length === 0 ? (
            <p className="text-muted-foreground text-xs">No available orders found.</p>
          ) : (
            <div className="space-y-1">
              {available.map((order) => (
                <div
                  key={order.id}
                  className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-medium">
                      {order.site_domain ?? 'Unknown site'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {order.publish_date ?? '—'} · {fmtMoney(order.price)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addOrder(order)}
                    className="text-muted-foreground hover:text-foreground ml-2 shrink-0 rounded p-1"
                    aria-label={`Add ${order.site_domain}`}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adjustments & metadata */}
        <div className="space-y-3">
          <p className="text-foreground text-sm font-medium">Invoice settings</p>
          <label className="gap-inset flex flex-col text-sm">
            <span className="text-muted-foreground">Adjustments (+ surcharge / − discount)</span>
            <input
              type="number"
              step="0.01"
              value={adjustments}
              onChange={(e) => setAdjustments(e.target.value)}
              className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            />
          </label>
          <label className="gap-inset flex flex-col text-sm">
            <span className="text-muted-foreground">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            />
          </label>
          <label className="gap-inset flex flex-col text-sm">
            <span className="text-muted-foreground">Notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-border bg-background text-foreground rounded-md border px-3 py-2 text-sm"
            />
          </label>
        </div>

        {/* Live totals preview */}
        <div className="border-border rounded-lg border px-4 py-3 text-sm">
          <p className="text-foreground mb-2 font-medium">Totals preview</p>
          <div className="space-y-1">
            <div className="text-muted-foreground flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtMoney(subtotal)}</span>
            </div>
            {adjValue !== 0 && (
              <div className="text-muted-foreground flex justify-between">
                <span>Adjustments</span>
                <span className="tabular-nums">{fmtMoney(adjValue)}</span>
              </div>
            )}
            <div
              className={cn(
                'flex justify-between border-t pt-1 font-semibold',
                total < 0 ? 'text-destructive' : 'text-foreground'
              )}
            >
              <span>Total</span>
              <span className="tabular-nums">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <SheetFooter className="border-border border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" variant="cta" onClick={handleSave} disabled={pending || total < 0}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </SheetFooter>
    </>
  )
}

export function EditInvoiceOrders({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {open && <EditInvoiceOrdersInner invoice={invoice} onClose={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}
