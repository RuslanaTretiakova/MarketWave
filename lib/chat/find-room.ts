import { adminClient } from '@/lib/supabase/admin'

/** Returns the chat room id for an order, or null if it has not been created yet. */
export async function findOrderRoomId(orderId: string): Promise<string | null> {
  const { data } = await adminClient
    .from('chat_rooms')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle()
  return data?.id ?? null
}
