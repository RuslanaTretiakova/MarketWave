import {
  INVOICE_STATUS_CHIP,
  INVOICE_STATUS_LABEL,
  type InvoiceStatus,
} from '@/lib/invoices/invoice-status-labels'
import { cn } from '@/lib/utils'

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        INVOICE_STATUS_CHIP[status],
        className
      )}
    >
      {INVOICE_STATUS_LABEL[status]}
    </span>
  )
}
