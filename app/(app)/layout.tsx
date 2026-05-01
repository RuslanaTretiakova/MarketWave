import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell/app-shell'
import { agentDebugLog } from '@/lib/agent-debug-log.server'
import { createClientOrNull } from '@/lib/supabase/server'

// Auth + cookies — must not be statically prerendered at build time (CI may omit Supabase env).
export const dynamic = 'force-dynamic'

/** Never cache authenticated shell HTML; logged-out users must not reuse stale RSC payloads. */
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClientOrNull()
  if (!supabase) {
    agentDebugLog({
      hypothesisId: 'H1',
      location: 'app/(app)/layout.tsx',
      message: 'no supabase client, redirect /maintenance',
    })
    redirect('/maintenance')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  agentDebugLog({
    hypothesisId: 'H3',
    location: 'app/(app)/layout.tsx:getUser',
    hasUser: Boolean(user),
    hasAuthError: Boolean(authError?.message),
  })

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
