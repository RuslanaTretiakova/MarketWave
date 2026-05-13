import {
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
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
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
