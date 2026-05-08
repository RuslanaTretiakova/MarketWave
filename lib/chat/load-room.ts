import { adminClient } from '@/lib/supabase/admin'
import { inferClientChatChannel } from '@/lib/chat/channel'
import type { ChatMessage, ChatParticipant, ChatRoomDetail } from '@/lib/chat/types'
import type { Database } from '@/lib/supabase/types'

const MESSAGE_PAGE_SIZE = 100

/**
 * Loads a single chat room with its participants and most recent messages, only when
 * the requesting user is a member (or is admin/manager). Returns null otherwise so
 * callers can fall through to `notFound()`.
 */
export async function loadChatRoom(
  roomId: string,
  userId: string,
  role: Database['public']['Enums']['user_role']
): Promise<ChatRoomDetail | null> {
  // Membership gate (admin can view any room).
  const { data: membership } = await adminClient
    .from('chat_room_participants')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()

  const isStaff = role === 'admin'
  if (!membership && !isStaff) return null

  const [roomResult, participantsResult, messagesResult, readResult] = await Promise.all([
    adminClient
      .from('chat_rooms')
      .select('id, kind, title, order_id, order:orders(site_domain)')
      .eq('id', roomId)
      .maybeSingle(),
    adminClient
      .from('chat_room_participants')
      .select('user_id, profiles(id, full_name, avatar_url, role)')
      .eq('room_id', roomId),
    adminClient
      .from('chat_messages')
      .select(
        'id, room_id, body, sender_id, message_type, created_at, profiles:profiles!chat_messages_sender_id_fkey(full_name)'
      )
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE),
    adminClient
      .from('chat_room_reads')
      .select('last_read_at')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  type RoomRow = {
    id: string
    kind: Database['public']['Enums']['chat_room_kind']
    title: string | null
    order_id: string | null
    order: { site_domain: string } | null
  }
  type ParticipantRow = {
    user_id: string
    profiles: {
      id: string
      full_name: string | null
      avatar_url: string | null
      role: Database['public']['Enums']['user_role']
    } | null
  }
  type MsgRow = {
    id: string
    room_id: string
    body: string
    sender_id: string | null
    message_type: Database['public']['Enums']['chat_message_type']
    created_at: string
    profiles: { full_name: string | null } | null
  }

  const room = roomResult.data as unknown as RoomRow | null
  if (!room) return null
  const participants = (participantsResult.data ?? []) as unknown as ParticipantRow[]
  const messagesRaw = (messagesResult.data ?? []) as unknown as MsgRow[]

  // Fetch attachments for these messages
  const messageIds = messagesRaw.map((m) => m.id)
  let attachmentsByMessage = new Map<
    string,
    {
      id: string
      storage_path: string
      file_name: string
      mime_type: string | null
      size_bytes: number | null
    }[]
  >()
  if (messageIds.length > 0) {
    const { data: attachments } = await adminClient
      .from('chat_message_attachments')
      .select('id, message_id, storage_path, file_name, mime_type, size_bytes')
      .in('message_id', messageIds)

    attachmentsByMessage = new Map()
    for (const att of attachments ?? []) {
      const list = attachmentsByMessage.get(att.message_id) ?? []
      list.push({
        id: att.id,
        storage_path: att.storage_path,
        file_name: att.file_name,
        mime_type: att.mime_type,
        size_bytes: att.size_bytes,
      })
      attachmentsByMessage.set(att.message_id, list)
    }
  }

  const messages: ChatMessage[] = messagesRaw
    .map((m) => ({
      id: m.id,
      room_id: m.room_id,
      sender_id: m.sender_id,
      sender_name: m.profiles?.full_name ?? null,
      body: m.body,
      message_type: m.message_type,
      created_at: m.created_at,
      attachments: attachmentsByMessage.get(m.id) ?? [],
    }))
    // We pulled DESC for the LIMIT; render oldest-first.
    .reverse()

  const chatParticipants: ChatParticipant[] = participants
    .filter((p) => p.profiles)
    .map((p) => ({
      user_id: p.profiles!.id,
      full_name: p.profiles!.full_name,
      avatar_url: p.profiles!.avatar_url,
      role: p.profiles!.role,
    }))

  return {
    id: room.id,
    kind: room.kind,
    channel: inferClientChatChannel({ kind: room.kind, title: room.title, orderId: room.order_id }),
    title: room.title,
    order_id: room.order_id,
    order_site_domain: room.order?.site_domain ?? null,
    participants: chatParticipants,
    messages,
    last_read_at: readResult.data?.last_read_at ?? null,
  }
}
