import { createClient } from '@supabase/supabase-js'

import type { Database } from './types'

// Service role client — server-side only, never import in client components.
// Used in Server Actions that need to bypass RLS (order creation, privileged mutations).
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
