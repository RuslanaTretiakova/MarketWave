import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type NotificationEvent = Database['public']['Enums']['notification_event']

type CreateNotificationParams = {
  event: NotificationEvent
  title: string
  message: string
  recipientUserIds: (string | null | undefined)[]
  actorUserId: string
  orderId?: string
  siteId?: string
  invoiceId?: string
  changeRequestId?: string
}

/**
 * Fire-and-forget: inserts one notification per recipient (excluding actor).
 * Logs errors but never throws.
 */
export async function createNotifications(params: CreateNotificationParams): Promise<void> {
  const recipients = [
    ...new Set(
      params.recipientUserIds.filter(
        (id): id is string => typeof id === 'string' && id !== params.actorUserId
      )
    ),
  ]
  if (recipients.length === 0) return

  const rows = recipients.map((recipientId) => ({
    recipient_user_id: recipientId,
    actor_user_id: params.actorUserId,
    event: params.event,
    title: params.title,
    message: params.message,
    order_id: params.orderId ?? null,
    site_id: params.siteId ?? null,
    invoice_id: params.invoiceId ?? null,
    change_request_id: params.changeRequestId ?? null,
  }))

  const { error } = await adminClient.from('notifications').insert(rows)
  if (error) console.error('[notifications/create]', error.message)
}

export async function getStaffUserIds(): Promise<string[]> {
  const { data } = await adminClient.from('profiles').select('id').in('role', ['admin', 'manager'])
  return (data ?? []).map((p) => p.id)
}
