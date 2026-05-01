import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell/app-shell'
import { createClient } from '@/lib/supabase/server'

/** Never cache authenticated shell HTML; logged-out users must not reuse stale RSC payloads. */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('require_password_change')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.require_password_change) {
    redirect('/auth/first-login-password')
  }

  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>
}
