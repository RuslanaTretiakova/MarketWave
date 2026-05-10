import type { Database } from '@/lib/supabase/types'
import type { ClientChatChannel } from '@/lib/chat/channel'

export type ChatRoomKind = Database['public']['Enums']['chat_room_kind']
export type ChatMessageType = Database['public']['Enums']['chat_message_type']
export type ChatRoomStatus = Database['public']['Enums']['chat_room_status']

export type ChatParticipant = {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  role: Database['public']['Enums']['user_role']
}

export type ChatRoomSummary = {
  id: string
  kind: ChatRoomKind
  channel: ClientChatChannel
  status: ChatRoomStatus
  system_managed: boolean
  title: string | null
  order_id: string | null
  order_site_domain: string | null
  created_at: string
  last_message_body: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  unread_count: number
  participants: ChatParticipant[]
  updated_at: string
}

export type ChatAttachment = {
  id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
}

export type ChatMessageReadBy = {
  user_id: string
  full_name: string | null
}

export type ChatMessage = {
  id: string
  room_id: string
  sender_id: string | null
  sender_name: string | null
  body: string
  message_type: ChatMessageType
  created_at: string
  attachments: ChatAttachment[]
  /** Populated for the current user’s sent messages: who has read them (per-message receipts). */
  read_by: ChatMessageReadBy[]
}

export type ChatRoomDetail = {
  id: string
  kind: ChatRoomKind
  channel: ClientChatChannel
  status: ChatRoomStatus
  system_managed: boolean
  created_at: string
  title: string | null
  order_id: string | null
  order_site_domain: string | null
  participants: ChatParticipant[]
  messages: ChatMessage[]
  /** ISO last-read marker for current user; null when never opened */
  last_read_at: string | null
}
