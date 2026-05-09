'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { CartItemRow } from '@/components/cart/cart-item-row'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  removeCartItem,
  updateCartItemDetails,
  updateCartItemPublishDate,
} from '@/lib/cart/cart-actions'
import type { CartItemRow as CartItemRowType } from '@/lib/cart/load-cart'
import { cn } from '@/lib/utils'

export function CartView({ initialItems }: { initialItems: CartItemRowType[] }) {
  const [pending, startTransition] = useTransition()

  const total = initialItems.reduce((sum, item) => sum + item.site_price, 0)

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeCartItem(id)
      if (!res.ok) toast.error(res.message)
      else toast.success('Item removed from cart.')
    })
  }

  function handlePublishDateChange(id: string, date: string | null) {
    startTransition(async () => {
      const res = await updateCartItemPublishDate(id, date)
      if (!res.ok) toast.error(res.message)
    })
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
    startTransition(async () => {
      const res = await updateCartItemDetails({ itemId: id, ...details })
      if (!res.ok) toast.error(res.message)
    })
  }

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
      <Card className="overflow-hidden p-0">
        {initialItems.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onRemove={handleRemove}
            onPublishDateChange={handlePublishDateChange}
            onDetailsChange={handleDetailsChange}
            pending={pending}
          />
        ))}
      </Card>

      <div className="border-border bg-muted/25 px-section py-block flex items-center justify-between rounded-xl border">
        <div>
          <p className="text-muted-foreground text-sm">Total</p>
          <p className="text-foreground text-2xl font-semibold tabular-nums">${total.toFixed(2)}</p>
        </div>
        <Link
          href="/cart/checkout"
          className={cn(
            buttonVariants({ variant: 'cta', size: 'default' }),
            pending ? 'pointer-events-none opacity-50' : ''
          )}
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  )
}
