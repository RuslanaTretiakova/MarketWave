import { adminClient } from '@/lib/supabase/admin'

export type ClientOption = {
  id: string
  full_name: string | null
  email: string | null
}

export async function loadClientOptions(opts?: {
  userId?: string
  role?: string
}): Promise<ClientOption[]> {
  let q = adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name', { ascending: true })

  if (opts?.role === 'manager' && opts.userId) {
    q = q.eq('account_manager_id', opts.userId)
  }

  const { data, error } = await q

  if (error) {
    console.error('[orders/client-options]', error.message)
    return []
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }))
}
