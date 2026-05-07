import { notFound, redirect } from 'next/navigation'

import { CheckoutView } from '@/components/cart/checkout-view'
import { loadCartWithTotal } from '@/lib/cart/load-cart'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Checkout',
}

export default async function CheckoutPage() {
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

  const { items, total } = await loadCartWithTotal(supabase)

  if (items.length === 0) {
    redirect('/cart')
  }

  return <CheckoutView items={items} total={total} />
}
