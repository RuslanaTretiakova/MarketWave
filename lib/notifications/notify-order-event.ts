import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type NotificationEvent = Database['public']['Enums']['notification_event']
type UserRole = Database['public']['Enums']['user_role']

export type OrderEventContext = {
  orderId: string
  actorUserId: string
  actorName?: string | null
  order: {
    user_id: string
    copywriter_id: string | null
    site_domain: string | null
  }
  invoiceId?: string
  changeRequestId?: string
  previousCopywriterId?: string | null
  newCopywriterName?: string | null
  previousCopywriterName?: string | null
}

type RecipientPlan = {
  recipientId: string
  role: 'client' | 'copywriter' | 'previousCopywriter' | 'manager'
}

type Copy = { title: string; message: string }

const ORDER_EVENTS: ReadonlyArray<NotificationEvent> = [
  'order_created',
  'copywriter_assigned',
  'copywriter_reassigned',
  'content_submitted',
  'changes_requested',
  'content_approved',
  'order_published',
  'invoice_paid',
  'invoice_sent',
]

async function loadManagerRecipientIds(excludeUserId: string): Promise<string[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'manager'] satisfies UserRole[])
    .neq('id', excludeUserId)
  if (error) {
    console.error('[notify-order-event/load-managers]', error.message)
    return []
  }
  return (data ?? []).map((row) => row.id)
}

function buildRecipientPlan(
  event: NotificationEvent,
  ctx: OrderEventContext,
  managerIds: string[]
): RecipientPlan[] {
  const plan: RecipientPlan[] = []
  const seen = new Set<string>()
  const push = (id: string | null | undefined, role: RecipientPlan['role']) => {
    if (!id || id === ctx.actorUserId || seen.has(id)) return
    seen.add(id)
    plan.push({ recipientId: id, role })
  }

  switch (event) {
    case 'order_created':
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'copywriter_assigned':
      push(ctx.order.copywriter_id, 'copywriter')
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'copywriter_reassigned':
      push(ctx.order.copywriter_id, 'copywriter')
      push(ctx.previousCopywriterId, 'previousCopywriter')
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'content_submitted':
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'changes_requested':
      push(ctx.order.copywriter_id, 'copywriter')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'content_approved':
      push(ctx.order.copywriter_id, 'copywriter')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'order_published':
      push(ctx.order.user_id, 'client')
      push(ctx.order.copywriter_id, 'copywriter')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'invoice_paid':
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    case 'invoice_sent':
      push(ctx.order.user_id, 'client')
      for (const id of managerIds) push(id, 'manager')
      break

    default:
      break
  }

  return plan
}

function entityLabel(ctx: OrderEventContext): string {
  return ctx.order.site_domain ?? 'an order'
}

function actorLabel(ctx: OrderEventContext): string {
  return ctx.actorName?.trim() || 'A teammate'
}

function copyFor(
  event: NotificationEvent,
  role: RecipientPlan['role'],
  ctx: OrderEventContext
): Copy {
  const entity = entityLabel(ctx)
  const actor = actorLabel(ctx)
  const newCw = ctx.newCopywriterName?.trim() || 'a copywriter'
  const prevCw = ctx.previousCopywriterName?.trim() || 'the previous copywriter'

  switch (event) {
    case 'order_created':
      if (role === 'client') {
        return { title: 'Order received', message: `Your order for ${entity} was received.` }
      }
      return { title: 'New order placed', message: `${actor} placed an order for ${entity}.` }

    case 'copywriter_assigned':
      if (role === 'copywriter') {
        return {
          title: 'You were assigned',
          message: `You were assigned to write content for ${entity}.`,
        }
      }
      if (role === 'client') {
        return {
          title: 'Copywriter assigned',
          message: `A copywriter has been assigned to your order for ${entity}.`,
        }
      }
      return {
        title: 'Copywriter assigned',
        message: `${actor} assigned ${newCw} to ${entity}.`,
      }

    case 'copywriter_reassigned':
      if (role === 'copywriter') {
        return {
          title: 'You were assigned',
          message: `You were assigned to ${entity} (reassigned from another copywriter).`,
        }
      }
      if (role === 'previousCopywriter') {
        return {
          title: 'You were removed',
          message: `You were removed from ${entity}; another copywriter has taken over.`,
        }
      }
      if (role === 'client') {
        return {
          title: 'Copywriter changed',
          message: `The copywriter on your order for ${entity} was changed.`,
        }
      }
      return {
        title: 'Copywriter reassigned',
        message: `${actor} reassigned ${entity} from ${prevCw} to ${newCw}.`,
      }

    case 'content_submitted':
      if (role === 'client') {
        return {
          title: 'Content ready for review',
          message: `Content for ${entity} is ready for your review.`,
        }
      }
      return {
        title: 'Content submitted',
        message: `${actor} submitted content for ${entity}.`,
      }

    case 'changes_requested':
      if (role === 'copywriter') {
        return {
          title: 'Changes requested',
          message: `${actor} requested changes on ${entity}.`,
        }
      }
      return {
        title: 'Changes requested',
        message: `${actor} requested changes on ${entity}.`,
      }

    case 'content_approved':
      if (role === 'copywriter') {
        return {
          title: 'Content approved',
          message: `Your content for ${entity} was approved.`,
        }
      }
      return {
        title: 'Content approved',
        message: `${actor} approved content for ${entity}.`,
      }

    case 'order_published':
      if (role === 'client') {
        return {
          title: 'Order published',
          message: `Your order for ${entity} is now published.`,
        }
      }
      if (role === 'copywriter') {
        return {
          title: 'Order published',
          message: `${entity} has been published.`,
        }
      }
      return {
        title: 'Order published',
        message: `${entity} was marked as published.`,
      }

    case 'invoice_paid':
      if (role === 'client') {
        return {
          title: 'Payment confirmed',
          message: `Payment for ${entity} was confirmed.`,
        }
      }
      return {
        title: 'Invoice paid',
        message: `Invoice for ${entity} marked as paid.`,
      }

    case 'invoice_sent':
      if (role === 'client') {
        return {
          title: 'Invoice sent',
          message: `An invoice for ${entity} has been sent to you.`,
        }
      }
      return {
        title: 'Invoice sent',
        message: `${actor} sent the invoice for ${entity}.`,
      }

    default:
      return { title: 'Update', message: `Update on ${entity}.` }
  }
}

/**
 * Single entry point for order/invoice notification emission. Builds a
 * role-specific row per related recipient, excludes the actor, and inserts
 * in one batch. Fire-and-forget: never throws — failures log only.
 */
export async function notifyOrderEvent(
  event: NotificationEvent,
  ctx: OrderEventContext
): Promise<void> {
  if (!ORDER_EVENTS.includes(event)) {
    console.warn('[notify-order-event] unsupported event:', event)
    return
  }

  const managerIds = await loadManagerRecipientIds(ctx.actorUserId)
  const plan = buildRecipientPlan(event, ctx, managerIds)
  if (plan.length === 0) return

  const rows = plan.map(({ recipientId, role }) => {
    const { title, message } = copyFor(event, role, ctx)
    return {
      recipient_user_id: recipientId,
      actor_user_id: ctx.actorUserId,
      event,
      title,
      message,
      order_id: ctx.orderId,
      invoice_id: ctx.invoiceId ?? null,
      change_request_id: ctx.changeRequestId ?? null,
      site_id: null,
    }
  })

  const { error } = await adminClient.from('notifications').insert(rows)
  if (error) console.error('[notify-order-event/insert]', error.message)
}
