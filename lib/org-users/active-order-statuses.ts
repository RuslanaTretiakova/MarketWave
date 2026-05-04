import type { Database } from '@/lib/supabase/types'

/** Order statuses considered active for disable/reassignment rules (non-terminal). */
export const ACTIVE_ORDER_STATUSES: Database['public']['Enums']['order_status'][] = [
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
]
