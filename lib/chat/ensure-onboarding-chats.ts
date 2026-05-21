import { adminClient } from '@/lib/supabase/admin'

/**
 * Idempotent: creates Support (user + all admins) and Sales (user + account manager)
 * onboarding rooms when a client finishes first-time password setup.
 */
export async function ensureOnboardingChatsForUser(userId: string): Promise<void> {
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('account_manager_id, role')
    .eq('id', userId)
    .maybeSingle()

  if (profErr || !profile || profile.role !== 'client') {
    return
  }

  const { data: existingSupport } = await adminClient
    .from('chat_rooms')
    .select('id')
    .eq('onboarding_for_user_id', userId)
    .eq('channel', 'support')
    .maybeSingle()

  if (!existingSupport) {
    const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
    const adminIds = (admins ?? []).map((a) => a.id)
    const participantIds = [...new Set([userId, ...adminIds])]

    const { data: room, error } = await adminClient
      .from('chat_rooms')
      .insert({
        kind: 'group',
        channel: 'support',
        title: 'Support',
        system_managed: true,
        onboarding_for_user_id: userId,
        status: 'active',
        created_by: null,
      })
      .select('id')
      .maybeSingle()

    if (error || !room) {
      if (!error?.message?.includes('duplicate') && error?.code !== '23505') {
        console.error('[chat/onboarding] support room', error?.message)
      }
    } else {
      const { error: pErr } = await adminClient
        .from('chat_room_participants')
        .insert(participantIds.map((uid) => ({ room_id: room.id, user_id: uid })))
      if (pErr) console.error('[chat/onboarding] support participants', pErr.message)
    }
  }

  const { data: existingSales } = await adminClient
    .from('chat_rooms')
    .select('id')
    .eq('onboarding_for_user_id', userId)
    .eq('channel', 'sales')
    .maybeSingle()

  if (existingSales) return

  const salesParticipantIds = [userId]
  if (profile.account_manager_id) salesParticipantIds.push(profile.account_manager_id)

  const { data: room, error } = await adminClient
    .from('chat_rooms')
    .insert({
      kind: 'group',
      channel: 'sales',
      title: 'Sales',
      system_managed: true,
      onboarding_for_user_id: userId,
      status: 'active',
      created_by: null,
    })
    .select('id')
    .maybeSingle()

  if (error || !room) {
    if (!error?.message?.includes('duplicate') && error?.code !== '23505') {
      console.error('[chat/onboarding] sales room', error?.message)
    }
    return
  }

  const { error: pErr } = await adminClient
    .from('chat_room_participants')
    .insert(salesParticipantIds.map((uid) => ({ room_id: room.id, user_id: uid })))
  if (pErr) console.error('[chat/onboarding] sales participants', pErr.message)
}
