import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
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
            Account details come from Supabase Auth and `profiles`; role-aware UI can branch on{' '}
            <code className="text-foreground bg-muted rounded px-1 py-0.5 text-xs">
              get_my_role()
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
