'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createOrdersFromCart } from '@/lib/orders/create-orders-action'
import type { CartItemRow } from '@/lib/cart/load-cart'

export function CheckoutView({ items, total }: { items: CartItemRow[]; total: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const res = await createOrdersFromCart()
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        `${res.orderIds.length} order${res.orderIds.length > 1 ? 's' : ''} placed successfully.`
      )
      router.push('/orders')
    })
  }

  return (
    <div className="space-y-layout mx-auto max-w-2xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Review your order</h2>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Confirm the sites below. Once placed, each item creates a separate order.
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Site
              </th>
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Publish date
              </th>
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Publication month
              </th>
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Anchor text
              </th>
              <th className="text-muted-foreground px-section py-block text-right font-medium">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-border border-b last:border-b-0">
                <td className="px-section py-block">
                  <p className="text-foreground font-medium">{item.site_domain}</p>
                  <p className="text-muted-foreground text-xs">{item.site_category}</p>
                </td>
                <td className="text-muted-foreground px-section py-block">
                  {item.publish_date ?? <span className="italic">Not set</span>}
                </td>
                <td className="text-muted-foreground px-section py-block">
                  {item.publish_month ? (
                    item.publish_month.slice(0, 7)
                  ) : (
                    <span className="italic">Not set</span>
                  )}
                </td>
                <td className="text-muted-foreground px-section py-block">
                  {item.anchor_text ?? <span className="italic">Not set</span>}
                </td>
                <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                  ${item.site_price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="border-border bg-muted/25 px-section py-block flex items-center justify-between rounded-xl border">
        <div>
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="text-foreground text-2xl font-semibold tabular-nums">${total.toFixed(2)}</p>
        </div>
        <Button
          type="button"
          variant="cta"
          size="default"
          onClick={handleConfirm}
          disabled={pending}
        >
          {pending ? 'Placing orders…' : 'Confirm order'}
        </Button>
      </div>
    </div>
  )
}
