'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { removeCartItem } from '@/lib/cart/cart-actions'
import {
  CART_NON_ACTIVE_SITE_DISCLAIMER,
  hasNonActiveSiteInCart,
  SITE_STATUS_LABEL,
} from '@/lib/cart/cart-site-availability'
import type { CartItemRow } from '@/lib/cart/load-cart'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createOrdersFromCart } from '@/lib/orders/create-orders-action'

export function CheckoutView({ items, total }: { items: CartItemRow[]; total: number }) {
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  const anyRowBusy = removingId !== null
  const checkoutBlocked = hasNonActiveSiteInCart(items)

  function handleRemove(itemId: string) {
    setRemovingId(itemId)
    void (async () => {
      try {
        const res = await removeCartItem(itemId)
        if (!res.ok) toast.error(res.message)
        else {
          toast.success('Removed from cart.')
          router.refresh()
        }
      } finally {
        setRemovingId(null)
      }
    })()
  }

  function handleConfirm() {
    setConfirmPending(true)
    void (async () => {
      try {
        const res = await createOrdersFromCart()
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success(
          `${res.orderIds.length} order${res.orderIds.length > 1 ? 's' : ''} placed successfully.`
        )
        router.push('/orders')
      } finally {
        setConfirmPending(false)
      }
    })()
  }

  return (
    <div className="space-y-layout mx-auto max-w-2xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Review your order</h2>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Confirm the sites below. Once placed, each item creates a separate order.
        </p>
      </div>

      {checkoutBlocked ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground px-section py-block rounded-xl border text-sm leading-relaxed"
          role="alert"
        >
          <p className="font-medium">Order creation blocked</p>
          <p className="text-muted-foreground mt-inset">{CART_NON_ACTIVE_SITE_DISCLAIMER}</p>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Site
              </th>
              <th className="text-muted-foreground px-section py-block text-left font-medium">
                Status
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
              <th className="text-muted-foreground px-section py-block text-right font-medium">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const siteActive = item.site_status === 'active'
              return (
                <tr
                  key={item.id}
                  className={
                    siteActive
                      ? 'border-border border-b last:border-b-0'
                      : 'border-border bg-destructive/5 border-b last:border-b-0'
                  }
                >
                  <td className="px-section py-block">
                    <p className="text-foreground font-medium">{item.site_domain}</p>
                    <p className="text-muted-foreground text-xs">{item.site_category}</p>
                  </td>
                  <td className="px-section py-block">
                    <span
                      className={
                        siteActive
                          ? 'text-muted-foreground text-sm capitalize'
                          : 'text-destructive text-sm font-medium capitalize'
                      }
                    >
                      {SITE_STATUS_LABEL[item.site_status]}
                    </span>
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
                  <td className="px-section py-block text-right align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-9 gap-1.5"
                      disabled={confirmPending || removingId === item.id}
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Remove ${item.site_domain} from cart`}
                    >
                      <Trash2 className="size-4 shrink-0" />
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </td>
                </tr>
              )
            })}
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
          disabled={confirmPending || anyRowBusy || checkoutBlocked}
          title={
            checkoutBlocked ? 'Remove sites that are not Active before creating orders.' : undefined
          }
        >
          {confirmPending
            ? 'Creating orders…'
            : items.length > 1
              ? 'Create orders'
              : 'Create order'}
        </Button>
      </div>
    </div>
  )
}
