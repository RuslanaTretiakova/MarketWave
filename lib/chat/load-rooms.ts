import { adminClient } from '@/lib/supabase/admin'
import { inferClientChatChannel, type ClientChatChannel } from '@/lib/chat/channel'
import type { ChatParticipant, ChatRoomSummary } from '@/lib/chat/types'
import type { Database } from '@/lib/supabase/types'

function isMissingChatSchema(message: string): boolean {
  return (
    message.includes('Could not find the table') ||
    message.includes('relation') ||
    message.includes('does not exist')
  )
}

export type ChatListSortMode = 'activity' | 'created'

export type ChatListFilters = {
  participantId?: string
  channel?: ClientChatChannel | 'all'
  status?: Database['public']['Enums']['chat_room_status'] | 'all'
  /** Inclusive start (YYYY-MM-DD) — compares to room `created_at` date in UTC */
  createdFrom?: string
  /** Inclusive end (YYYY-MM-DD) */
  createdTo?: string
  sort?: ChatListSortMode
}

/**
 * Load every chat room the given user participates in, joined with the latest message
 * and computed unread count. Uses the service-role client behind a participation gate
 * so we can produce ordered/paginated results without RLS-driven recursion.
 */
export async function loadChatRooms(
  userId: string,
  filters: ChatListFilters = {}
): Promise<ChatRoomSummary[]> {
  const sort: ChatListSortMode = filters.sort ?? 'activity'

  // 1. Find the rooms this user belongs to.
  const { data: membership, error: memErr } = await adminClient
    .from('chat_room_participants')
    .select('room_id')
    .eq('user_id', userId)

  if (memErr) {
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
      .select(
        'id, kind, channel, title, order_id, updated_at, created_at, status, system_managed, order:orders(site_domain)'
      )
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

  if (roomsResult.error) {
    if (isMissingChatSchema(roomsResult.error.message ?? '')) return []
    console.error('[chat/load-rooms] rooms', roomsResult.error.message)
    return []
  }

  type RoomRow = {
    id: string
    kind: Database['public']['Enums']['chat_room_kind']
    channel: Database['public']['Enums']['chat_channel_type']
    title: string | null
    order_id: string | null
    updated_at: string
    created_at: string
    status: Database['public']['Enums']['chat_room_status']
    system_managed: boolean
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
    const channel = inferClientChatChannel({
      channel: r.channel,
      kind: r.kind,
      title: r.title,
      orderId: r.order_id,
    })
    return {
      id: r.id,
      kind: r.kind,
      channel,
      status: r.status ?? 'active',
      system_managed: r.system_managed ?? false,
      title: r.title,
      order_id: r.order_id,
      order_site_domain: r.order?.site_domain ?? null,
      created_at: r.created_at ?? r.updated_at,
      last_message_body: last?.body ?? null,
      last_message_at: last?.created_at ?? null,
      last_message_sender_id: last?.sender_id ?? null,
      unread_count: unreadByRoom.get(r.id) ?? 0,
      participants: participantsByRoom.get(r.id) ?? [],
      updated_at: r.updated_at,
    }
  })

  let out = summaries

  if (filters.participantId) {
    const pid = filters.participantId
    out = out.filter((s) => s.participants.some((p) => p.user_id === pid))
  }

  if (filters.channel && filters.channel !== 'all') {
    out = out.filter((s) => s.channel === filters.channel)
  }

  if (filters.status && filters.status !== 'all') {
    out = out.filter((s) => s.status === filters.status)
  }

  if (filters.createdFrom) {
    const fromMs = Date.parse(filters.createdFrom + 'T00:00:00.000Z')
    out = out.filter((s) => new Date(s.created_at).getTime() >= fromMs)
  }
  if (filters.createdTo) {
    const toMs = Date.parse(filters.createdTo + 'T23:59:59.999Z')
    out = out.filter((s) => new Date(s.created_at).getTime() <= toMs)
  }

  if (sort === 'created') {
    out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else {
    out.sort((a, b) => {
      const ta = a.last_message_at ?? a.updated_at
      const tb = b.last_message_at ?? b.updated_at
      return new Date(tb).getTime() - new Date(ta).getTime()
    })
  }

  return out
}

/** Total unread across all rooms for the given user (used for nav badge). */
export async function loadTotalUnreadCount(userId: string): Promise<number> {
  const rooms = await loadChatRooms(userId)
  return rooms.reduce((sum, r) => sum + r.unread_count, 0)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Build filters from URL search params (`/chats` and `/chats/[id]` sidebars). */
export function chatListFiltersFromSearchParams(sp: {
  with?: string | string[]
  channel?: string | string[]
  status?: string | string[]
  from?: string | string[]
  to?: string | string[]
  sort?: string | string[]
}): ChatListFilters {
  const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v

  const filters: ChatListFilters = {}
  const withId = one(sp.with)
  if (withId && UUID_RE.test(withId)) filters.participantId = withId

  const ch = one(sp.channel)
  if (ch === 'standard' || ch === 'support' || ch === 'sales') filters.channel = ch
  if (ch === 'all') filters.channel = 'all'

  const st = one(sp.status)
  if (st === 'active' || st === 'archived') filters.status = st
  if (st === 'all') filters.status = 'all'

  const from = one(sp.from)
  if (from && ISO_DATE_RE.test(from)) filters.createdFrom = from
  const to = one(sp.to)
  if (to && ISO_DATE_RE.test(to)) filters.createdTo = to

  const sort = one(sp.sort)
  if (sort === 'created' || sort === 'activity') filters.sort = sort

  return filters
}
