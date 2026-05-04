import { adminClient } from '@/lib/supabase/admin'

const WINDOW_MS = 60_000
const RATE_MAX = 20

/** Returns true when under limit and records this attempt; false when rate-limited or on hard errors. */
export async function checkAndRecordAdminInviteRateLimit(actorId: string): Promise<boolean> {
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString()

  const { count, error: countErr } = await adminClient
    .from('admin_invite_rate_events')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', actorId)
    .gte('created_at', sinceIso)

  if (countErr) {
    console.error('[admin invite rate limit] count failed:', countErr.message)
    return false
  }

  if ((count ?? 0) >= RATE_MAX) {
    return false
  }

  const { error: insErr } = await adminClient.from('admin_invite_rate_events').insert({
    actor_id: actorId,
  })

  if (insErr) {
    console.error('[admin invite rate limit] insert failed:', insErr.message)
    return false
  }

  return true
}
