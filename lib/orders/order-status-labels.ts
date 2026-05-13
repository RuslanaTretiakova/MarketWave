import type { Database } from '@/lib/supabase/types'

export type OrderStatus = Database['public']['Enums']['order_status']
type UserRole = Database['public']['Enums']['user_role']

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New',
  in_progress: 'In progress',
  content_sent: 'Content sent',
  needs_changes: 'Needs changes',
  content_approved: 'Content approved',
  published: 'Published',
  completed: 'Completed',
  canceled: 'Canceled',
}

export const ORDER_STATUSES_ORDERED: OrderStatus[] = [
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
  'completed',
  'canceled',
]

const ORDER_STATUS_LABEL_BY_ROLE: Partial<Record<UserRole, Partial<Record<OrderStatus, string>>>> =
  {
    client: { content_sent: 'Awaiting your approval' },
    copywriter: { content_sent: 'Sent for review' },
  }

export function orderStatusLabelForRole(
  status: OrderStatus,
  role: UserRole | null | undefined
): string {
  if (role) {
    const override = ORDER_STATUS_LABEL_BY_ROLE[role]?.[status]
    if (override) return override
  }
  return ORDER_STATUS_LABEL[status]
}

export const ORDER_STATUS_CHIP: Record<OrderStatus, string> = {
  new: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  content_sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  needs_changes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  content_approved: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-200',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}
