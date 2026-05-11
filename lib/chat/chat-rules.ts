import type { Database } from '@/lib/supabase/types'

export type ChatChannel = Database['public']['Enums']['chat_channel_type']
export type ChatRoomStatus = Database['public']['Enums']['chat_room_status']

/** Product rule: only Standard chats can be edited (title/participants). */
export function canEditChatMetadata(channel: ChatChannel): boolean {
  return channel === 'standard'
}

export function canArchiveChat(
  channel: ChatChannel,
  status: ChatRoomStatus,
  systemManaged: boolean
): boolean {
  return channel === 'standard' && status === 'active' && !systemManaged
}

export function canUnarchiveChat(channel: ChatChannel, status: ChatRoomStatus): boolean {
  return channel === 'standard' && status === 'archived'
}

export function canSendMessages(status: ChatRoomStatus): boolean {
  return status === 'active'
}
