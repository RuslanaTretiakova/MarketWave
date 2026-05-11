import { adminClient } from '@/lib/supabase/admin'

export type ClientOption = {
  id: string
  full_name: string | null
  email: string | null
}

export async function loadClientOptions(): Promise<ClientOption[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'client')
    .order('full_name', { ascending: true })

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
