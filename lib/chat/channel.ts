import type { Database } from '@/lib/supabase/types'

export type ClientChatChannel = Database['public']['Enums']['chat_channel_type']

/**
 * Derive a client-facing channel label from existing room metadata so we can
 * support Support/Sales/Standard terminology without a schema migration.
 */
export function inferClientChatChannel(opts: {
  channel?: ClientChatChannel | null
  kind: Database['public']['Enums']['chat_room_kind']
  title: string | null
  orderId: string | null
}): ClientChatChannel {
  if (opts.channel) return opts.channel
  if (opts.kind === 'order' || opts.orderId) return 'standard'

  const title = (opts.title ?? '').toLowerCase()
  if (title.includes('support')) return 'support'
  if (title.includes('sales')) return 'sales'

  // Direct and group chats default to Sales for non-order commercial dialogs.
  if (opts.kind === 'direct' || opts.kind === 'group') return 'sales'
  return 'standard'
}

export function clientChatChannelLabel(channel: ClientChatChannel): string {
  switch (channel) {
    case 'support':
      return 'Support chat'
    case 'sales':
      return 'Sales chat'
    case 'standard':
    default:
      return 'Standard chat'
  }
}
