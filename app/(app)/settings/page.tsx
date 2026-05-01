import { redirect } from 'next/navigation'

import { InviteTeamCard } from '@/components/invite-team-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const { data: auditRows } =
    profile?.role === 'admin'
      ? await supabase
          .from('auth_audit_log')
          .select('id, action, target_email, created_at')
          .order('created_at', { ascending: false })
          .limit(30)
      : { data: null }

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          Organization profile, notifications, and integrations — extend as your rollout grows.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Account details come from Supabase Auth and{' '}
            <code className="text-foreground bg-muted rounded px-1 py-0.5 text-xs">profiles</code>;
            role-aware UI branches on{' '}
            <code className="text-foreground bg-muted rounded px-1 py-0.5 text-xs">
              get_my_role()
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>

      {profile?.role === 'admin' ? (
        <Card>
          <CardHeader>
            <CardTitle>Team invitations</CardTitle>
            <CardDescription>
              Invite users by email. Only one organization admin is supported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteTeamCard
              initialAudit={(auditRows ?? []).map((r) => ({
                id: r.id,
                action: r.action,
                target_email: r.target_email,
                created_at: r.created_at,
              }))}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
