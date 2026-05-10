import { notFound, redirect } from 'next/navigation'

import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { ClientDashboard } from '@/components/dashboard/client-dashboard'
import { CopywriterDashboard } from '@/components/dashboard/copywriter-dashboard'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'
import { SourcerDashboard } from '@/components/dashboard/sourcer-dashboard'
import { loadAdminDashboard } from '@/lib/dashboard/load-admin-dashboard'
import { loadClientDashboard } from '@/lib/dashboard/load-client-dashboard'
import { loadCopywriterDashboard } from '@/lib/dashboard/load-copywriter-dashboard'
import { loadManagerDashboard } from '@/lib/dashboard/load-manager-dashboard'
import { loadSourcerDashboard } from '@/lib/dashboard/load-sourcer-dashboard'
import { createClient } from '@/lib/supabase/server'
import { getCachedAppUserContext } from '@/lib/supabase/cached-app-user.server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const { user, profile } = await getCachedAppUserContext()
  if (!user) {
    notFound()
  }

  if (profile?.require_password_change) {
    redirect('/auth/first-login-password')
  }

  const role = profile?.role ?? 'client'
  const greetingName = profile?.full_name ?? user.user_metadata?.full_name ?? null
  const supabase = await createClient()

  switch (role) {
    case 'admin': {
      const data = await loadAdminDashboard(supabase)
      return <AdminDashboard data={data} />
    }
    case 'manager': {
      const data = await loadManagerDashboard(supabase)
      return <ManagerDashboard data={data} greetingName={greetingName} />
    }
    case 'sourcer': {
      const data = await loadSourcerDashboard(supabase, user.id)
      return <SourcerDashboard data={data} greetingName={greetingName} />
    }
    case 'copywriter': {
      const data = await loadCopywriterDashboard(supabase, user.id)
      return <CopywriterDashboard data={data} greetingName={greetingName} />
    }
    case 'client':
    default: {
      const data = await loadClientDashboard(supabase, user.id)
      return <ClientDashboard data={data} greetingName={greetingName} />
    }
  }
}
