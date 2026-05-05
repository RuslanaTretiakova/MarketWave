import { notFound, redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell/app-shell'
import { agentDebugLog } from '@/lib/agent-debug-log.server'
import { getCachedAppUserContext } from '@/lib/supabase/cached-app-user.server'

// Auth + cookies — must not be statically prerendered at build time (CI may omit Supabase env).
// Never cache authenticated shell HTML; logged-out users must not reuse stale RSC payloads.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile, authError } = await getCachedAppUserContext()

  if (!supabase) {
    agentDebugLog({
      hypothesisId: 'H1',
      location: 'app/(app)/layout.tsx',
      message: 'no supabase client, redirect /maintenance',
    })
    redirect('/maintenance')
  }

  agentDebugLog({
    hypothesisId: 'H3',
    location: 'app/(app)/layout.tsx:getUser',
    hasUser: Boolean(user),
    hasAuthError: Boolean(authError?.message),
  })

  if (!user) {
    notFound()
  }

  if (profile?.require_password_change) {
    redirect('/auth/first-login-password')
  }

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? '',
        fullName: profile?.full_name ?? null,
        role: profile?.role ?? 'client',
        avatarUrl: profile?.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  )
}
