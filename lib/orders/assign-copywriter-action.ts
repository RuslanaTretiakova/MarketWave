'use server'

import { revalidatePath } from 'next/cache'

import { createNotifications } from '@/lib/notifications/create-notification'
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
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can assign copywriters.' }
  }

  if (copywriterId !== null) {
    const { data: targetProfile, error: targetErr } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', copywriterId)
      .maybeSingle()

    if (targetErr || !targetProfile) {
      return { ok: false, message: 'Copywriter not found.' }
    }
    if (targetProfile.role !== 'copywriter') {
      return { ok: false, message: 'The selected user is not a copywriter.' }
    }
  }

  const { data: order } = await adminClient
    .from('orders')
    .select('copywriter_id, site_domain')
    .eq('id', orderId)
    .maybeSingle()

  const { error } = await adminClient
    .from('orders')
    .update({
      copywriter_id: copywriterId,
      ...(copywriterId ? { status: 'in_progress' } : {}),
    })
    .eq('id', orderId)

  if (error) return { ok: false, message: error.message ?? 'Could not assign copywriter.' }

  if (copywriterId) {
    const isReassignment = order?.copywriter_id != null && order.copywriter_id !== copywriterId
    const domain = order?.site_domain ?? 'an order'

    void createNotifications({
      event: isReassignment ? 'copywriter_reassigned' : 'copywriter_assigned',
      title: isReassignment ? 'Copywriter reassigned' : 'Copywriter assigned',
      message: isReassignment
        ? `You have been assigned to ${domain} (reassigned from another copywriter).`
        : `You have been assigned to write content for ${domain}.`,
      recipientUserIds: isReassignment ? [copywriterId, order?.copywriter_id] : [copywriterId],
      actorUserId: user.id,
      orderId,
    })
  }

  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/notifications')
  return { ok: true }
}
