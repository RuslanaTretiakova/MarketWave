import { notFound } from 'next/navigation'

import Link from 'next/link'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <PageHeader
        title="Settings"
        description="Organization profile, notifications, and integrations — extend as your rollout grows."
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            View and edit your display name, photo, email, and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/profile"
            className={cn(buttonVariants({ variant: 'cta', size: 'default' }))}
          >
            Open profile settings
          </Link>
        </CardContent>
      </Card>

      {profile?.role === 'admin' ? (
        <Card>
          <CardHeader>
            <CardTitle>Team & users</CardTitle>
            <CardDescription>
              Invite teammates, assign roles, and manage access from the Users workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/settings/users"
              className={cn(buttonVariants({ variant: 'cta', size: 'default' }))}
            >
              Open user management
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
