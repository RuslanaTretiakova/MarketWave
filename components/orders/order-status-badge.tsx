import {
  ORDER_STATUS_CHIP,
  orderStatusLabelForRole,
  type OrderStatus,
} from '@/lib/orders/order-status-labels'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type UserRole = Database['public']['Enums']['user_role']

export function OrderStatusBadge({
  status,
  role,
  className,
}: {
  status: OrderStatus
  role?: UserRole | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        ORDER_STATUS_CHIP[status],
        className
      )}
    >
      {orderStatusLabelForRole(status, role ?? null)}
    </span>
  )
}
