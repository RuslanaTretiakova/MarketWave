'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

async function requireEarningsManager(): Promise<
  { ok: true; role: UserRole } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can manage payouts.' }
  }
  return { ok: true, role: profile.role }
}

export async function markEarningPaid(
  earningId: string,
  payoutReference: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireEarningsManager()
  if (!auth.ok) return auth

  const patch = {
    payout_status: 'paid',
    paid_at: new Date().toISOString(),
    payout_reference: payoutReference?.trim() || null,
  }
  const { error } = await adminClient.from('sourcer_earnings').update(patch).eq('id', earningId)
  if (error) return { ok: false, message: error.message ?? 'Could not mark payout as paid.' }

  revalidatePath('/earnings')
  return { ok: true }
}
