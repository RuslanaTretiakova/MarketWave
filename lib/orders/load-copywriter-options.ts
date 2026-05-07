import { adminClient } from '@/lib/supabase/admin'

export type CopywriterOption = {
  id: string
  full_name: string | null
  email: string | null
}

export async function loadCopywriterOptions(): Promise<CopywriterOption[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'copywriter')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[orders/copywriter-options]', error.message)
    return []
  }

  return (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
  }))
}
