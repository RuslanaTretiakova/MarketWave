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

  return <CartView initialItems={items} />
}
