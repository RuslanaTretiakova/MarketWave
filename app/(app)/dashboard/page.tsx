import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { SourcerDashboard } from '@/components/dashboard/sourcer-dashboard'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { loadSourcerDashboard } from '@/lib/dashboard/load-sourcer-dashboard'
import { loadDashboardStats } from '@/lib/dashboard/load-dashboard-stats'
import { createClient } from '@/lib/supabase/server'
import { getCachedAppUserContext } from '@/lib/supabase/cached-app-user.server'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

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
        hint: 'You are the organization admin — invite teammates from Users.',
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

type Snapshot = { title: string; value: string | number; hint: string }

function buildSnapshots(stats: Awaited<ReturnType<typeof loadDashboardStats>>): Snapshot[] {
  switch (stats.kind) {
    case 'client':
      return [
        {
          title: 'Orders in flight',
          value: stats.ordersInFlight,
          hint: 'Active orders from new through published.',
        },
        {
          title: 'Completed orders',
          value: stats.ordersCompleted,
          hint: 'Successfully completed placements.',
        },
        {
          title: 'Awaiting your approval',
          value: stats.pendingContentApprovals,
          hint: 'Content sent — review and approve or request changes.',
        },
      ]
    case 'admin':
      return [
        {
          title: 'Active orders',
          value: stats.totalActiveOrders,
          hint: 'Orders in progress across all clients.',
        },
        {
          title: 'Sites in review',
          value: stats.sitesInReview,
          hint: 'Pending sourcer submissions awaiting approval.',
        },
        {
          title: 'Pending invoices',
          value: stats.pendingInvoices,
          hint: 'Invoices awaiting payment confirmation.',
        },
      ]
    case 'manager':
      return [
        { title: 'Active orders', value: stats.totalActiveOrders, hint: 'Orders in progress.' },
        {
          title: 'Awaiting action',
          value: stats.ordersAwaitingAction,
          hint: 'New orders ready to start.',
        },
        {
          title: 'Open change requests',
          value: stats.openChangeRequests,
          hint: 'Client change requests to address.',
        },
      ]
    case 'copywriter':
      return [
        {
          title: 'Assigned orders',
          value: stats.assignedOrders,
          hint: 'Orders currently assigned to you.',
        },
        {
          title: 'Pending content send',
          value: stats.pendingContentSend,
          hint: 'In-progress orders waiting for your content.',
        },
        { title: 'Completed', value: stats.completedOrders, hint: 'Orders you have completed.' },
      ]
    case 'sourcer':
      return [
        {
          title: 'Sites submitted',
          value: stats.sitesSubmitted,
          hint: 'All sites you have submitted.',
        },
        {
          title: 'Active sites',
          value: stats.sitesActive,
          hint: 'Sites live in the client catalog.',
        },
        {
          title: 'Pending review',
          value: stats.sitesPendingReview,
          hint: 'Awaiting admin approval.',
        },
      ]
    default:
      return [
        { title: 'Orders in flight', value: '—', hint: 'Active orders.' },
        { title: 'Sites in catalog', value: '—', hint: 'Curated inventory.' },
        { title: 'Pending approvals', value: '—', hint: 'Items awaiting your action.' },
      ]
  }
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
  const { title, hint } = roleHeadline(
    role,
    profile?.full_name ?? user.user_metadata?.full_name ?? null
  )

  const supabase = await createClient()

  if (role === 'sourcer') {
    const sourcerData = await loadSourcerDashboard(supabase, user.id)
    return (
      <SourcerDashboard
        data={sourcerData}
        greetingName={profile?.full_name ?? user.user_metadata?.full_name ?? null}
      />
    )
  }

  const stats = await loadDashboardStats(supabase, role, user.id)
  const snapshots = buildSnapshots(stats)

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
            ? 'Open Users to invite teammates by email and assign roles.'
            : 'Explore the site catalog and cart from the sidebar — data layers connect when you wire queries.'}
        </p>
        <div className="mt-layout gap-inset flex flex-wrap">
          {role === 'admin' ? (
            <Link
              href="/settings/users"
              className={cn(buttonVariants({ variant: 'cta', size: 'default' }))}
            >
              User management
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
