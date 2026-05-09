import type { Database } from '@/lib/supabase/types'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  canceled: 'Canceled',
}

export const INVOICE_STATUSES_ORDERED: InvoiceStatus[] = ['pending', 'overdue', 'paid', 'canceled']

export const INVOICE_STATUS_CHIP: Record<InvoiceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  canceled: 'bg-muted text-muted-foreground',
}
