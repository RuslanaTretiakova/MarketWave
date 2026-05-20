import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']
type OrderStatus = Database['public']['Enums']['order_status']
type InvoiceStatus = Database['public']['Enums']['invoice_status']

export type OrderActionId =
  | 'view_details'
  | 'edit_order'
  | 'start_order'
  | 'cancel_order'
  | 'assign_copywriter'
  | 'submit_content'
  | 'approve_content'
  | 'request_changes'
  | 'resume_order'
  | 'publish_order'
  | 'override_status'
  | 'delete_order'
  | 'view_invoice'
  | 'mark_invoice_paid'
  | 'send_invoice'

export type OrderActionGroupKey = 'order' | 'content' | 'invoice' | 'admin'

export type OrderActionAvailability = {
  id: OrderActionId
  group: OrderActionGroupKey
  enabled: boolean
}

export type OrderActionContext = {
  role: UserRole
  status: OrderStatus
  userId: string
  orderUserId: string
  copywriterId: string | null
  invoiceId?: string | null
  invoiceStatus?: InvoiceStatus | null
}

function canEditOrder(ctx: OrderActionContext): boolean {
  if (ctx.role === 'admin') return true
  return ctx.role === 'client' && ctx.userId === ctx.orderUserId && ctx.status === 'new'
}

export function getOrderActionAvailability(ctx: OrderActionContext): OrderActionAvailability[] {
  const isOwnOrder = ctx.userId === ctx.orderUserId
  const isStaff = ctx.role === 'admin' || ctx.role === 'manager'
  const isAssignedCopywriter = ctx.role === 'copywriter' && ctx.userId === ctx.copywriterId
  const hasInvoice = Boolean(ctx.invoiceId)

  return [
    { id: 'view_details', group: 'order', enabled: true },
    { id: 'edit_order', group: 'order', enabled: canEditOrder(ctx) },
    {
      id: 'start_order',
      group: 'order',
      enabled: isStaff && ctx.status === 'new',
    },
    {
      id: 'cancel_order',
      group: 'order',
      enabled:
        (ctx.role === 'client' && isOwnOrder && ctx.status === 'new') ||
        (isStaff && ctx.status === 'new'),
    },
    {
      id: 'assign_copywriter',
      group: 'order',
      enabled:
        isStaff &&
        (ctx.status === 'new' ||
          ctx.status === 'in_progress' ||
          ctx.status === 'content_sent' ||
          ctx.status === 'needs_changes'),
    },
    {
      id: 'submit_content',
      group: 'content',
      enabled:
        isAssignedCopywriter && (ctx.status === 'in_progress' || ctx.status === 'needs_changes'),
    },
    {
      id: 'approve_content',
      group: 'content',
      enabled: ctx.role === 'client' && isOwnOrder && ctx.status === 'content_sent',
    },
    {
      id: 'request_changes',
      group: 'content',
      enabled: ctx.role === 'client' && isOwnOrder && ctx.status === 'content_sent',
    },
    {
      id: 'resume_order',
      group: 'content',
      enabled: isStaff && ctx.status === 'needs_changes',
    },
    {
      id: 'publish_order',
      group: 'content',
      enabled: isStaff && ctx.status === 'content_approved',
    },
    {
      id: 'view_invoice',
      group: 'invoice',
      enabled: hasInvoice,
    },
    {
      id: 'mark_invoice_paid',
      group: 'invoice',
      enabled: hasInvoice && isStaff && ctx.invoiceStatus === 'sent',
    },
    {
      id: 'send_invoice',
      group: 'invoice',
      enabled: hasInvoice && isStaff && ctx.invoiceStatus === 'draft',
    },
    {
      id: 'override_status',
      group: 'admin',
      enabled: ctx.role === 'admin',
    },
    {
      id: 'delete_order',
      group: 'admin',
      enabled: ctx.role === 'admin' && (ctx.status === 'new' || ctx.status === 'canceled'),
    },
  ]
}

export function isOrderActionEnabled(
  actions: OrderActionAvailability[],
  actionId: OrderActionId
): boolean {
  return actions.some((action) => action.id === actionId && action.enabled)
}
