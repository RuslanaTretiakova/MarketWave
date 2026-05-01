import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Dashboard',
}

type Role = Database['public']['Enums']['user_role']

function roleHeadline(role: Role, name: string | null) {
  const who = name?.trim() || 'there'
  switch (role) {
    case 'admin':
      return {
        title: `Welcome, ${who}`,
        hint: 'You are the organization admin — invite teammates from Settings.',
      }
    case 'client':
      return { title: `Welcome back, ${who}`, hint: 'Your hub for orders, cart, and approvals.' }
    case 'manager':
      return { title: `Manager dashboard`, hint: 'Track orders, sites, and team throughput.' }
    case 'sourcer':
      return { title: `Sourcing workspace`, hint: 'Catalog and placements pipeline at a glance.' }
    case 'copywriter':
      return { title: `Copy workspace`, hint: 'Orders and change requests land here.' }
    default:
      return { title: `Welcome back, ${who}`, hint: 'Your ops hub for placements.' }
  }
}

const snapshots = [
  {
    title: 'Orders in flight',
    value: '—',
    hint: 'Statuses from new through published sync here once orders exist.',
  },
  {
    title: 'Sites in catalog',
    value: '—',
    hint: 'Curated inventory your team shops from — wired to Supabase next.',
  },
  {
    title: 'Pending approvals',
    value: '—',
    hint: 'Client and manager approvals surface here for faster turnaround.',
  },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, require_password_change')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.require_password_change) {
    redirect('/auth/first-login-password')
  }

  const role = profile?.role ?? 'client'
  const { title, hint } = roleHeadline(
    role,
    profile?.full_name ?? user.user_metadata?.full_name ?? null
  )

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          {hint} {SITE_NAME} — catalog, orders, and billing in one flow.
        </p>
      </div>
      <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-3">
        {snapshots.map((s) => (
          <Card key={s.title} size="sm">
            <CardHeader>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">{s.value}</CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="border-border bg-muted/25 p-section rounded-xl border">
        <h3 className="text-foreground text-base font-semibold">Next steps</h3>
        <p className="text-muted-foreground mt-inset max-w-xl text-sm leading-relaxed">
          {role === 'admin'
            ? 'Open Settings to invite users by email and assign roles.'
            : 'Explore the site catalog and cart from the sidebar — data layers connect when you wire queries.'}
        </p>
        <div className="mt-layout gap-inset flex flex-wrap">
          {role === 'admin' ? (
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: 'cta', size: 'default' }))}
            >
              Team invitations
            </Link>
          ) : null}
          <Link
            href="/sites"
            className={cn(buttonVariants({ variant: 'default', size: 'default' }))}
          >
            Browse site catalog
          </Link>
          <Link
            href="/orders"
            className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
          >
            View orders
          </Link>
        </div>
      </section>
    </div>
  )
}
