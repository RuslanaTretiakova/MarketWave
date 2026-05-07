import { notFound } from 'next/navigation'

import { CartView } from '@/components/cart/cart-view'
import { createClient } from '@/lib/supabase/server'
import { loadCartWithTotal } from '@/lib/cart/load-cart'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Cart',
}

export default async function CartPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'client') notFound()

  const { items } = await loadCartWithTotal(supabase)

  return (
    <div className="space-y-layout mx-auto max-w-3xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Cart</h2>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Review your selected sites before placing an order.
        </p>
      </div>
      <CartView initialItems={items} />
    </div>
  )
}
