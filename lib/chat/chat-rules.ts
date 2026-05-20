import type { Database } from '@/lib/supabase/types'

export type ChatChannel = Database['public']['Enums']['chat_channel_type']
export type ChatRoomStatus = Database['public']['Enums']['chat_room_status']

/** Standard chats are editable by anyone; Support/Sales chats are editable by admin/manager only. */
export function canEditChatMetadata(channel: ChatChannel, role?: string): boolean {
  if (channel === 'standard') return true
  if (channel === 'support' || channel === 'sales') {
    return role === 'admin' || role === 'manager'
  }
  return false
}

export function canArchiveChat(channel: ChatChannel, status: ChatRoomStatus): boolean {
  return channel === 'standard' && status === 'active'
}

export function canUnarchiveChat(channel: ChatChannel, status: ChatRoomStatus): boolean {
  return channel === 'standard' && status === 'archived'
}

export function canSendMessages(status: ChatRoomStatus): boolean {
  return status === 'active'
}
