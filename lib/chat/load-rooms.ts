import { adminClient } from '@/lib/supabase/admin'
import { inferClientChatChannel } from '@/lib/chat/channel'
import type { ChatParticipant, ChatRoomSummary } from '@/lib/chat/types'
import type { Database } from '@/lib/supabase/types'

function isMissingChatSchema(message: string): boolean {
  return (
    message.includes('Could not find the table') ||
    message.includes('relation') ||
    message.includes('does not exist')
  )
}

/**
 * Load every chat room the given user participates in, joined with the latest message
 * and computed unread count. Uses the service-role client behind a participation gate
 * so we can produce ordered/paginated results without RLS-driven recursion.
 */
export async function loadChatRooms(userId: string): Promise<ChatRoomSummary[]> {
  // 1. Find the rooms this user belongs to.
  const { data: membership, error: memErr } = await adminClient
    .from('chat_room_participants')
    .select('room_id')
    .eq('user_id', userId)

  if (memErr) {
    // Before chat migrations are applied, fail soft so the app shell still renders.
    if (isMissingChatSchema(memErr.message ?? '')) return []
    console.error('[chat/load-rooms] membership', memErr.message)
    return []
  }

  const roomIds = (membership ?? []).map((r) => r.room_id)
  if (roomIds.length === 0) return []

  // 2. Pull room rows + latest message + read marker in parallel.
  const [roomsResult, messagesResult, readsResult, participantsResult] = await Promise.all([
    adminClient
      .from('chat_rooms')
      .select('id, kind, title, order_id, updated_at, order:orders(site_domain)')
      .in('id', roomIds),
    adminClient
      .from('chat_messages')
      .select('id, room_id, body, sender_id, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false }),
    adminClient
      .from('chat_room_reads')
      .select('room_id, last_read_at')
      .eq('user_id', userId)
      .in('room_id', roomIds),
    adminClient
      .from('chat_room_participants')
      .select('room_id, user_id, profiles(id, full_name, avatar_url, role)')
      .in('room_id', roomIds),
  ])

  type RoomRow = {
    id: string
    kind: Database['public']['Enums']['chat_room_kind']
    title: string | null
    order_id: string | null
    updated_at: string
    order: { site_domain: string } | null
  }
  type MsgRow = {
    id: string
    room_id: string
    body: string
    sender_id: string | null
    created_at: string
  }
  type ReadRow = { room_id: string; last_read_at: string }
  type ParticipantRow = {
    room_id: string
    user_id: string
    profiles: {
      id: string
      full_name: string | null
      avatar_url: string | null
      role: Database['public']['Enums']['user_role']
    } | null
  }

  const rooms = (roomsResult.data ?? []) as unknown as RoomRow[]
  const messages = (messagesResult.data ?? []) as unknown as MsgRow[]
  const reads = (readsResult.data ?? []) as unknown as ReadRow[]
  const participants = (participantsResult.data ?? []) as unknown as ParticipantRow[]

  const lastMessageByRoom = new Map<string, MsgRow>()
  for (const m of messages) {
    if (!lastMessageByRoom.has(m.room_id)) {
      lastMessageByRoom.set(m.room_id, m)
    }
  }

  const readByRoom = new Map<string, string>()
  for (const r of reads) readByRoom.set(r.room_id, r.last_read_at)

  // Unread = messages in this room sent by another user after the user's last_read_at.
  const unreadByRoom = new Map<string, number>()
  for (const m of messages) {
    if (m.sender_id === userId) continue
    const lastRead = readByRoom.get(m.room_id)
    if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
      unreadByRoom.set(m.room_id, (unreadByRoom.get(m.room_id) ?? 0) + 1)
    }
  }

  const participantsByRoom = new Map<string, ChatParticipant[]>()
  for (const p of participants) {
    const list = participantsByRoom.get(p.room_id) ?? []
    if (p.profiles) {
      list.push({
        user_id: p.profiles.id,
        full_name: p.profiles.full_name,
        avatar_url: p.profiles.avatar_url,
        role: p.profiles.role,
      })
    }
    participantsByRoom.set(p.room_id, list)
  }

  const summaries: ChatRoomSummary[] = rooms.map((r) => {
    const last = lastMessageByRoom.get(r.id)
    return {
      id: r.id,
      kind: r.kind,
      channel: inferClientChatChannel({ kind: r.kind, title: r.title, orderId: r.order_id }),
      title: r.title,
      order_id: r.order_id,
      order_site_domain: r.order?.site_domain ?? null,
      last_message_body: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
      last_message_sender_id: last?.sender_id ?? null,
      unread_count: unreadByRoom.get(r.id) ?? 0,
      participants: participantsByRoom.get(r.id) ?? [],
      updated_at: r.updated_at,
    }
  })

  // Sort by latest activity (last message > updated_at fallback)
  summaries.sort((a, b) => {
    const ta = a.last_message_at ?? a.updated_at
    const tb = b.last_message_at ?? b.updated_at
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  return summaries
}

/** Total unread across all rooms for the given user (used for nav badge). */
export async function loadTotalUnreadCount(userId: string): Promise<number> {
  const rooms = await loadChatRooms(userId)
  return rooms.reduce((sum, r) => sum + r.unread_count, 0)
}
