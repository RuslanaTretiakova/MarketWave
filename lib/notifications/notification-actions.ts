'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export async function markNotificationRead(
  notificationId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!notificationId) return { ok: false, message: 'Invalid notification ID.' }

  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_user_id', user.id)
    .is('read_at', null)

  if (error) return { ok: false, message: error.message ?? 'Could not mark notification as read.' }
  revalidatePath('/notifications')
  return { ok: true }
}

export async function markAllNotificationsRead(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user.id)
    .is('read_at', null)

  if (error) return { ok: false, message: error.message ?? 'Could not mark notifications as read.' }
  revalidatePath('/notifications')
  return { ok: true }
}
