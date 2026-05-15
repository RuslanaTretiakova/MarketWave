'use server'

import { revalidatePath } from 'next/cache'

import { notifyOrderEvent } from '@/lib/notifications/notify-order-event'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function assignCopywriter(
  orderId: string,
  copywriterId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can assign copywriters.' }
  }

  let newCopywriterName: string | null = null
  if (copywriterId !== null) {
    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', copywriterId)
      .maybeSingle()

    if (targetErr || !targetProfile) {
      return { ok: false, message: 'Copywriter not found.' }
    }
    if (targetProfile.role !== 'copywriter') {
      return { ok: false, message: 'The selected user is not a copywriter.' }
    }
    newCopywriterName = targetProfile.full_name ?? null
  }

  const { data: order } = await adminClient
    .from('orders')
    .select('copywriter_id, site_domain, user_id')
    .eq('id', orderId)
    .maybeSingle()

  const previousCopywriterId = order?.copywriter_id ?? null

  const { error } = await adminClient
    .from('orders')
    .update({
      copywriter_id: copywriterId,
      ...(copywriterId ? { status: 'in_progress' } : {}),
    })
    .eq('id', orderId)

  if (error) return { ok: false, message: error.message ?? 'Could not assign copywriter.' }

  if (copywriterId) {
    const isReassignment = previousCopywriterId != null && previousCopywriterId !== copywriterId

    let previousCopywriterName: string | null = null
    if (isReassignment && previousCopywriterId) {
      const { data: prevProfile } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', previousCopywriterId)
        .maybeSingle()
      previousCopywriterName = prevProfile?.full_name ?? null
    }

    void notifyOrderEvent(isReassignment ? 'copywriter_reassigned' : 'copywriter_assigned', {
      orderId,
      actorUserId: user.id,
      actorName: profile.full_name ?? null,
      order: {
        user_id: order?.user_id ?? '',
        copywriter_id: copywriterId,
        site_domain: order?.site_domain ?? null,
      },
      previousCopywriterId: isReassignment ? previousCopywriterId : null,
      newCopywriterName,
      previousCopywriterName,
    })
  }

  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/notifications')
  return { ok: true }
}
