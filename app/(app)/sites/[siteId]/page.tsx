import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SiteDetailToolbar } from '@/components/sites/site-detail-toolbar'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SITE_STATUS_LABEL } from '@/lib/sites/site-status-labels'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Role = Database['public']['Enums']['user_role']

type SiteDetailRow = Database['public']['Tables']['sites']['Row'] & {
  categories: { id: number; name: string } | null
  site_countries: { country: string }[] | null
  site_languages: { language: string }[] | null
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="gap-inset py-inset grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="text-foreground text-sm leading-relaxed">{children}</dd>
    </div>
  )
}

export async function generateMetadata(props: {
  params: Promise<{ siteId: string }>
}): Promise<Metadata> {
  const { siteId } = await props.params
  const supabase = await createClient()
  const { data } = await supabase.from('sites').select('domain').eq('id', siteId).maybeSingle()
  return {
    title: data?.domain ? `${data.domain} · Site` : 'Site',
  }
}

export default async function SiteDetailPage(props: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) notFound()

  const role = profile.role as Role

  const { data: site, error } = await supabase
    .from('sites')
    .select(
      `
      *,
      categories(id, name),
      site_countries(country),
      site_languages(language)
    `
    )
    .eq('id', siteId)
    .maybeSingle()

  if (error || !site) {
    notFound()
  }

  const row = site as unknown as SiteDetailRow
  const countries = [...new Set((row.site_countries ?? []).map((c) => c.country))].sort()
  const languages = [...new Set((row.site_languages ?? []).map((l) => l.language))].sort()

  const ids = [row.needs_changes_by, row.approved_by, row.sourcer_id].filter(Boolean) as string[]
  const profileMap = new Map<string, { full_name: string | null; email: string | null }>()
  if (role === 'admin' && ids.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
    for (const p of profs ?? []) {
      profileMap.set(p.id, { full_name: p.full_name, email: p.email })
    }
  }

  let sourcerStillAssigned = false
  if (role === 'admin' && row.sourcer_id) {
    const { data: sp } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', row.sourcer_id)
      .eq('role', 'sourcer')
      .maybeSingle()
    sourcerStillAssigned = Boolean(sp)
  }

  function profileLabel(id: string | null): string {
    if (!id) return '—'
    const p = profileMap.get(id)
    if (!p) return id
    return (p.full_name?.trim() || p.email || id).slice(0, 120)
  }

  const showStaffExtras = role === 'sourcer' || role === 'manager' || role === 'admin'
  const showSourcerNotes = role === 'sourcer' || role === 'admin'
  const showContact = role === 'sourcer' || role === 'manager' || role === 'admin'

  return (
    <div className="gap-layout mx-auto flex max-w-3xl flex-col">
      <div className="gap-block flex flex-wrap items-start justify-between">
        <div className="space-y-inset min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            View site
          </p>
          <h2 className="font-display text-foreground mt-inset text-xl font-semibold tracking-tight">
            {row.domain}
          </h2>
          <p className="text-muted-foreground mt-inset max-w-xl text-xs leading-relaxed">
            {row.categories?.name ?? 'Uncategorized'} · {SITE_STATUS_LABEL[row.status]}
          </p>
        </div>
        <Link
          href="/sites"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'h-10 min-h-10 shrink-0 justify-center rounded-full'
          )}
        >
          Catalog
        </Link>
      </div>

      <SiteDetailToolbar
        role={role}
        userId={user.id}
        siteId={row.id}
        domain={row.domain}
        status={row.status}
        sourcerId={row.sourcer_id}
      />

      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <dl className="divide-border px-section py-block divide-y">
          <Field label="Domain">{row.domain}</Field>
          <Field label="DR">{row.dr ?? '—'}</Field>
          <Field label="Category">{row.categories?.name ?? '—'}</Field>
          <Field label="Top countries">{row.top_countries?.trim() || '—'}</Field>
          <Field label="Countries">{countries.length ? countries.join(', ') : '—'}</Field>
          <Field label="Languages">{languages.length ? languages.join(', ') : '—'}</Field>
          <Field label="Price">{formatMoney(row.price)}</Field>
          <Field label="Status">{SITE_STATUS_LABEL[row.status]}</Field>

          {role === 'admin' && row.status === 'needs_changes' ? (
            <>
              <Field label="Need changes by">{profileLabel(row.needs_changes_by)}</Field>
              <Field label="Need changes at">
                {row.needs_changes_at ? new Date(row.needs_changes_at).toLocaleString() : '—'}
              </Field>
            </>
          ) : null}

          {role === 'admin' && row.status === 'active' && row.approved_by ? (
            <>
              <Field label="Approved by">{profileLabel(row.approved_by)}</Field>
              <Field label="Approved at">
                {row.approved_at ? new Date(row.approved_at).toLocaleString() : '—'}
              </Field>
            </>
          ) : null}

          {showStaffExtras ? (
            <Field label="Requirements">{row.requirements?.trim() || '—'}</Field>
          ) : null}

          <Field label="Description">{row.description?.trim() || '—'}</Field>

          {showSourcerNotes ? (
            <Field label="Sourcer notes">{row.sourcer_notes?.trim() || '—'}</Field>
          ) : null}

          {showContact ? (
            <Field label="Contact info">{row.contact_info?.trim() || '—'}</Field>
          ) : null}

          <Field label="Link type">{row.link_type}</Field>
          <Field label="Keywords relevance">{row.keywords_relevance?.trim() || '—'}</Field>
          <Field label="Organic keywords count">{row.organic_keywords_count ?? '—'}</Field>
          <Field label="Organic traffic count">{row.organic_traffic_count ?? '—'}</Field>

          {role === 'admin' ? (
            <>
              <Field label="Created by (sourcer)">{profileLabel(row.sourcer_id)}</Field>
              <Field label="Is sourcer still assigned?">
                {sourcerStillAssigned ? 'Yes' : 'No'}
              </Field>
            </>
          ) : null}
        </dl>
      </section>

      <Separator className="opacity-60" />

      <p className="text-muted-foreground text-center text-xs">
        Prices and placement terms may change — confirm details before ordering.
      </p>
    </div>
  )
}
