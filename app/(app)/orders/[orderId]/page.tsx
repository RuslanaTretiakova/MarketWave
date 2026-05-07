import { notFound } from 'next/navigation'

import { OrderDetailView } from '@/components/orders/order-detail-view'
import { loadCopywriterOptions } from '@/lib/orders/load-copywriter-options'
import { loadOrderDetail } from '@/lib/orders/load-order-detail'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params

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

  if (!profile) notFound()

  // Sourcers do not have access to orders
  if (profile.role === 'sourcer') notFound()

  const order = await loadOrderDetail(supabase, orderId, profile.role)
  if (!order) notFound()

  const isStaff = profile.role === 'admin' || profile.role === 'manager'
  const copywriterOptions = isStaff ? await loadCopywriterOptions() : undefined

  return (
    <OrderDetailView
      order={order}
      role={profile.role}
      userId={user.id}
      copywriterOptions={copywriterOptions}
    />
  )
}
