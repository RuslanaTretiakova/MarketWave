import { adminClient } from '@/lib/supabase/admin'

export type ManagerOption = {
  id: string
  full_name: string | null
  email: string | null
}

export async function loadManagerOptions(): Promise<ManagerOption[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'manager')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[org-users/manager-options]', error.message)
    return []
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }))
}
