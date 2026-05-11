'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export type ChatProfileSearchHit = {
  id: string
  full_name: string | null
  email: string | null
  role: Database['public']['Enums']['user_role']
}

function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/%/g, '').replace(/,/g, '').slice(0, 80)
}

/**
 * Scoped people search for adding chat participants. Uses the service role after session check.
 */
export async function searchProfilesForChatAction(
  query: string
): Promise<{ ok: true; hits: ChatProfileSearchHit[] } | { ok: false; message: string }> {
  const q = query.trim()
  if (q.length < 2) {
    return { ok: true, hits: [] }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Not signed in.' }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!me) return { ok: false, message: 'Profile not found.' }

  const role = me.role
  const frag = sanitizeIlikeFragment(q)
  const needle = `%${frag}%`

  let allowedIds: Set<string> | null = null

  if (role === 'client') {
    const { data: myRooms } = await adminClient
      .from('chat_room_participants')
      .select('room_id')
      .eq('user_id', user.id)

    const roomIds = (myRooms ?? []).map((r) => r.room_id)
    allowedIds = new Set<string>()
    if (roomIds.length > 0) {
      const { data: mates } = await adminClient
        .from('chat_room_participants')
        .select('user_id')
        .in('room_id', roomIds)
      for (const m of mates ?? []) {
        allowedIds.add(m.user_id)
      }
    }

    const { data: staff } = await adminClient
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'manager'])
    for (const s of staff ?? []) {
      allowedIds.add(s.id)
    }
    allowedIds.add(user.id)
  }

  const baseSelect = 'id, full_name, email, role'

  const [byName, byEmail] = await Promise.all([
    adminClient.from('profiles').select(baseSelect).ilike('full_name', needle).limit(20),
    adminClient.from('profiles').select(baseSelect).ilike('email', needle).limit(20),
  ])

  if (byName.error) {
    return { ok: false, message: byName.error.message ?? 'Search failed.' }
  }
  if (byEmail.error) {
    return { ok: false, message: byEmail.error.message ?? 'Search failed.' }
  }

  const merged = new Map<string, ChatProfileSearchHit>()
  for (const r of [...(byName.data ?? []), ...(byEmail.data ?? [])]) {
    if (r.id === user.id) continue
    if (role === 'client' && allowedIds && !allowedIds.has(r.id)) continue
    merged.set(r.id, {
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      role: r.role,
    })
  }

  const hits = [...merged.values()].slice(0, 20)
  return { ok: true, hits }
}
