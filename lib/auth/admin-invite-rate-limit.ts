import { adminClient } from '@/lib/supabase/admin'

const WINDOW_MS = 60_000
const RATE_MAX = 20

export type AdminInviteRateLimitResult = { ok: true } | { ok: false; reason: 'rate_limited' }

/**
 * Under limit → records one event and returns ok.
 * Over limit → rate_limited.
 * DB errors on count/insert → allow invite (best-effort rate limit; see server logs).
 */
export async function checkAndRecordAdminInviteRateLimit(
  actorId: string
): Promise<AdminInviteRateLimitResult> {
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString()

  const { count, error: countErr } = await adminClient
    .from('admin_invite_rate_events')
    .select('*', { count: 'exact', head: true })
    .eq('actor_id', actorId)
    .gte('created_at', sinceIso)

  if (countErr) {
    // Table missing or permissions: still allow invite (rate limit is best-effort).
    console.warn('[admin invite rate limit] count failed (skipping limit):', countErr.message)
    return { ok: true }
  }

  if ((count ?? 0) >= RATE_MAX) {
    return { ok: false, reason: 'rate_limited' }
  }

  const { error: insErr } = await adminClient.from('admin_invite_rate_events').insert({
    actor_id: actorId,
  })

  if (insErr) {
    console.warn('[admin invite rate limit] insert failed (skipping limit):', insErr.message)
    return { ok: true }
  }

  return { ok: true }
}
