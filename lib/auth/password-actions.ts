'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function completePasswordChange(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, message: 'Not signed in.' }
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ require_password_change: false })
    .eq('id', user.id)

  if (error) {
    return { ok: false, message: 'Could not update your account. Try again.' }
  }
  return { ok: true }
}
