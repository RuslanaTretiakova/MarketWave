'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { CartItemRow } from '@/components/cart/cart-item-row'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  removeCartItem,
  updateCartItemDetails,
  updateCartItemPublishDate,
} from '@/lib/cart/cart-actions'
import {
  CART_NON_ACTIVE_SITE_DISCLAIMER,
  hasNonActiveSiteInCart,
} from '@/lib/cart/cart-site-availability'
import type { CartItemRow as CartItemRowType } from '@/lib/cart/load-cart'
import { cn } from '@/lib/utils'

export function CartView({ initialItems }: { initialItems: CartItemRowType[] }) {
  const router = useRouter()
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null)

  const total = initialItems.reduce((sum, item) => sum + item.site_price, 0)

  function handleRemove(id: string) {
    setMutatingItemId(id)
    void (async () => {
      try {
        const res = await removeCartItem(id)
        if (!res.ok) toast.error(res.message)
        else {
          toast.success('Item removed from cart.')
          router.refresh()
        }
      } finally {
        setMutatingItemId(null)
      }
    })()
  }

  function handlePublishDateChange(id: string, date: string | null) {
    setMutatingItemId(id)
    void (async () => {
      try {
        const res = await updateCartItemPublishDate(id, date)
        if (!res.ok) toast.error(res.message)
        else router.refresh()
      } finally {
        setMutatingItemId(null)
      }
    })()
  }

  function handleDetailsChange(
    id: string,
    details: {
      publishMonth?: string | null
      anchorText?: string | null
      targetUrl?: string | null
      clientNotes?: string | null
    }
  ) {
    setMutatingItemId(id)
    void (async () => {
      try {
        const res = await updateCartItemDetails({ itemId: id, ...details })
        if (!res.ok) toast.error(res.message)
        else router.refresh()
      } finally {
        setMutatingItemId(null)
      }
    })()
  }

  const anyMutating = mutatingItemId !== null
  const checkoutBlocked = hasNonActiveSiteInCart(initialItems)

  if (initialItems.length === 0) {
    return (
      <Card className="py-hero gap-block flex flex-col items-center text-center">
        <ShoppingCart className="text-muted-foreground size-10" />
        <div className="space-y-inset">
          <p className="text-foreground font-semibold">Your cart is empty</p>
          <p className="text-muted-foreground text-sm">
            Browse the site catalog to add sites to your cart.
          </p>
        </div>
        <Link href="/sites" className={cn(buttonVariants({ variant: 'cta' }), 'mt-block')}>
          Browse site catalog
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-block">
      {checkoutBlocked ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground px-section py-block rounded-xl border text-sm leading-relaxed"
          role="alert"
        >
          <p className="font-medium">Checkout unavailable</p>
          <p className="text-muted-foreground mt-inset">{CART_NON_ACTIVE_SITE_DISCLAIMER}</p>
        </div>
      ) : null}
      <Card className="overflow-hidden p-0">
        {initialItems.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onRemove={handleRemove}
            onPublishDateChange={handlePublishDateChange}
            onDetailsChange={handleDetailsChange}
            pending={mutatingItemId === item.id}
          />
        ))}
      </Card>

      <div className="border-border bg-muted/25 px-section py-block flex items-center justify-between rounded-xl border">
        <div>
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="text-foreground text-2xl font-semibold tabular-nums">${total.toFixed(2)}</p>
        </div>
        {checkoutBlocked || anyMutating ? (
          <span
            className={cn(
              buttonVariants({ variant: 'cta', size: 'default' }),
              'pointer-events-none cursor-not-allowed opacity-60'
            )}
            title={
              checkoutBlocked ? 'Remove sites that are not Active before checkout.' : undefined
            }
          >
            Proceed to checkout
          </span>
        ) : (
          <Link
            href="/cart/checkout"
            className={buttonVariants({ variant: 'cta', size: 'default' })}
          >
            Proceed to checkout
          </Link>
        )}
      </div>
    </div>
  )
}
