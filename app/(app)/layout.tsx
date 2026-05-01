import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app-shell/app-shell'
import { agentDebugLog } from '@/lib/agent-debug-log.server'
import { createClientOrNull } from '@/lib/supabase/server'

// Auth + cookies — must not be statically prerendered at build time (CI may omit Supabase env).
export const dynamic = 'force-dynamic'

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
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>
}
