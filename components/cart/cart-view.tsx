'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { CartItemRow } from '@/components/cart/cart-item-row'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { removeCartItem, updateCartItemDetails } from '@/lib/cart/cart-actions'
import {
  CART_NON_ACTIVE_SITE_DISCLAIMER,
  hasNonActiveSiteInCart,
} from '@/lib/cart/cart-site-availability'
import type { CartItemRow as CartItemRowType } from '@/lib/cart/load-cart'
import { createOrderFromCartItem } from '@/lib/orders/create-orders-action'
import { cn } from '@/lib/utils'

export function CartView({ initialItems }: { initialItems: CartItemRowType[] }) {
  const router = useRouter()
  const [mutatingItemId, setMutatingItemId] = useState<string | null>(null)
  const [creatingOrderItemId, setCreatingOrderItemId] = useState<string | null>(null)

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

  function handleDetailsChange(
    id: string,
    details: {
      publishMonth?: string | null
      anchorText?: string | null
      clientNotes?: string | null
    }
  ) {
    void (async () => {
      const res = await updateCartItemDetails({ itemId: id, ...details })
      if (!res.ok) toast.error(res.message)
    })()
  }

  function handleCreateSingleOrder(cartItemId: string) {
    const item = initialItems.find((i) => i.id === cartItemId)
    setCreatingOrderItemId(cartItemId)
    void (async () => {
      try {
        const res = await createOrderFromCartItem(cartItemId)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Order placed successfully.', {
          description: item?.site_domain,
        })
        router.refresh()
      } finally {
        setCreatingOrderItemId(null)
      }
    })()
  }

  const checkoutBlocked = hasNonActiveSiteInCart(initialItems)

  return (
    <div className="gap-layout flex flex-col">
      <PageHeader title="Cart" description="Review your selected sites before placing an order." />

      {initialItems.length === 0 ? (
        <div className="py-hero gap-block flex flex-col items-center text-center">
          <ShoppingCart className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">Your cart is empty</p>
            <p className="text-muted-foreground text-sm">
              Browse the site catalog to add sites to your cart.
            </p>
          </div>
          <Link
            href="/sites"
            className={cn(buttonVariants({ variant: 'cta', size: 'default' }), 'h-10')}
          >
            Browse site catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-block">
          {checkoutBlocked ? (
            <div
              className="border-destructive/40 bg-destructive/5 text-foreground px-section py-block rounded-xl border text-sm leading-relaxed"
              role="alert"
            >
              <p className="font-medium">Order creation unavailable</p>
              <p className="text-muted-foreground mt-inset">{CART_NON_ACTIVE_SITE_DISCLAIMER}</p>
            </div>
          ) : null}
          {initialItems.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onDetailsChange={handleDetailsChange}
              onCreateOrder={handleCreateSingleOrder}
              pending={mutatingItemId === item.id}
              creatingOrder={creatingOrderItemId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
