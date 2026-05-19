import { notFound } from 'next/navigation'

import { SiteDetailHeaderActions } from '@/components/sites/site-detail-header-actions'
import { SiteListingForm } from '@/components/sites/site-listing-form'
import type { SiteFormSourcerOption } from '@/components/sites/site-listing-form'
import { PageHeader } from '@/components/ui/page-header'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await props.params
  const supabase = await createClient()
  const { data } = await supabase.from('sites').select('domain').eq('id', siteId).maybeSingle()
  return {
    title: data?.domain ? `Edit ${data.domain}` : 'Edit site',
  }
}

export default async function EditSitePage(props: { params: Promise<{ siteId: string }> }) {
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

  if (!profile || (profile.role !== 'admin' && profile.role !== 'sourcer')) {
    notFound()
  }

  const { data: site, error: siteErr } = await supabase
    .from('sites')
    .select(
      `
      *,
      site_countries(country),
      site_languages(language)
    `
    )
    .eq('id', siteId)
    .maybeSingle()

  if (siteErr || !site) {
    notFound()
  }

  const canEdit =
    profile.role === 'admin' ||
    (profile.role === 'sourcer' && site.sourcer_id === user.id && site.status !== 'archived')

  if (!canEdit) {
    notFound()
  }

  const { data: categoriesRaw, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (catErr || !categoriesRaw?.length) {
    throw new Error(catErr?.message ?? 'No categories available.')
  }

  let sourcersForAdmin: SiteFormSourcerOption[] | undefined
  if (profile.role === 'admin') {
    const { data: sourcers } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'sourcer')
      .order('full_name', { ascending: true })

    sourcersForAdmin =
      sourcers?.map((s) => ({
        id: s.id,
        label: (s.full_name?.trim() || s.email || s.id).slice(0, 80),
      })) ?? []
  }

  type SiteCountries = { country: string }[] | null
  type SiteLangs = { language: string }[] | null

  const sc = site.site_countries as unknown as SiteCountries
  const sl = site.site_languages as unknown as SiteLangs
  const countries = [...new Set((sc ?? []).map((r) => r.country))].sort()
  const languages = [...new Set((sl ?? []).map((r) => r.language))].sort()

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Edit site"
        description="Saving updates listing data. Sourcer edits reset review status to Pending."
        action={
          <SiteDetailHeaderActions
            role={profile.role}
            userId={user.id}
            siteId={siteId}
            domain={site.domain}
            status={site.status}
            sourcerId={site.sourcer_id}
            siteInCart={false}
          />
        }
      />

      <SiteListingForm
        mode="edit"
        siteId={siteId}
        role={profile.role}
        status={site.status}
        categories={categoriesRaw}
        sourcersForAdmin={sourcersForAdmin}
        initial={{
          domain: site.domain,
          dr: site.dr ?? 0,
          category_id: site.category_id,
          price: site.price,
          link_type: site.link_type,
          requirements: site.requirements ?? '',
          description: site.description ?? '',
          sourcer_notes: site.sourcer_notes ?? '',
          contact_info: site.contact_info ?? '',
          keywords_relevance: site.keywords_relevance ?? [],
          organic_keywords_count: site.organic_keywords_count ?? 0,
          organic_traffic_count: site.organic_traffic_count ?? 0,
          countries,
          languages,
          sourcer_id: site.sourcer_id ?? '',
        }}
      />
    </div>
  )
}
