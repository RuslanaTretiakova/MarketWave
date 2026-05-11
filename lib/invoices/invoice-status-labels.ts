import type { Database } from '@/lib/supabase/types'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
}

export const INVOICE_STATUSES_ORDERED: InvoiceStatus[] = ['draft', 'sent', 'paid']

export const INVOICE_STATUS_CHIP: Record<InvoiceStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}
