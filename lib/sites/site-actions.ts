'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/types'

async function logSiteError(opts: {
  level?: 'info' | 'warn' | 'error' | 'critical'
  context: string
  message: string
  payload?: Record<string, unknown> | null
  userId?: string | null
}): Promise<void> {
  const { level = 'error', context, message, payload, userId } = opts

  const { error } = await adminClient.from('error_logs').insert({
    level,
    context: context.slice(0, 500),
    message: message.slice(0, 4000),
    payload: (payload ?? null) as Json | null,
    user_id: userId ?? null,
  })

  if (error) {
    console.error('[logSiteError] DB write failed', error.message)
  }
}

type ProfileRole = Database['public']['Enums']['user_role']

async function getSessionContext(): Promise<
  | {
      supabase: Awaited<ReturnType<typeof createClient>>
      userId: string
      role: ProfileRole
    }
  | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { error: 'You must be signed in.' }
  }
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) {
    return { error: 'Profile not found.' }
  }
  return { supabase, userId: user.id, role: profile.role }
}

function parseCodeList(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Validate ISO 3166-1 alpha-2 country code */
function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code)
}

/** Validate ISO 639-1/3 language code */
function isValidLanguageCode(code: string): boolean {
  return /^[a-z]{2,3}$/.test(code)
}

/** Normalize DR / counts; rejects NaN and negatives. */
function reqNat(name: string, v: number): string | null {
  if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
    return `${name} must be a non-negative whole number.`
  }
  return null
}

function reqPositiveMoney(name: string, v: number): string | null {
  if (!Number.isFinite(v) || v < 0) {
    return `${name} must be a valid non-negative amount.`
  }
  return null
}

/** Shared payload for create / update site listing fields (excluding status audit columns). */
export type SiteListingPayload = {
  domain: string
  dr: number
  category_id: number
  price: number
  link_type: Database['public']['Enums']['link_type']
  requirements?: string | null
  description?: string | null
  sourcer_notes?: string | null
  contact_info?: string | null
  keywords_relevance?: string | null
  organic_keywords_count: number
  organic_traffic_count: number
  top_countries?: string | null
  countriesCsv: string
  languagesCsv: string
  sourcer_id?: string | null
}

export async function createSite(
  input: SiteListingPayload
): Promise<{ ok: true; siteId: string } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) {
    return { ok: false, message: ctx.error }
  }
  const { supabase, role } = ctx

  if (role !== 'sourcer') {
    return { ok: false, message: 'You cannot create sites.' }
  }

  const domain = input.domain.trim().toLowerCase()
  if (!domain) {
    return { ok: false, message: 'Domain is required.' }
  }

  const countries = parseCodeList(input.countriesCsv).map((c) => c.toUpperCase())
  const languages = parseCodeList(input.languagesCsv).map((l) => l.toLowerCase())
  if (countries.length === 0) {
    return { ok: false, message: 'Add at least one country code.' }
  }
  if (languages.length === 0) {
    return { ok: false, message: 'Add at least one language code.' }
  }
  if (!countries.every(isValidCountryCode)) {
    return { ok: false, message: 'Invalid country code(s). Use ISO 3166-1 alpha-2 (e.g., US, GB).' }
  }
  if (!languages.every(isValidLanguageCode)) {
    return { ok: false, message: 'Invalid language code(s). Use ISO 639-1/3 (e.g., en, spa).' }
  }

  const eDr = reqNat('DR', input.dr)
  if (eDr) return { ok: false, message: eDr }
  if (input.dr > 100) {
    return { ok: false, message: 'DR cannot exceed 100.' }
  }

  const eOk = reqNat('Organic keywords count', input.organic_keywords_count)
  if (eOk) return { ok: false, message: eOk }
  const eOt = reqNat('Organic traffic count', input.organic_traffic_count)
  if (eOt) return { ok: false, message: eOt }

  const ePrice = reqPositiveMoney('Price', input.price)
  if (ePrice) return { ok: false, message: ePrice }

  if (!Number.isFinite(input.category_id) || input.category_id <= 0) {
    return { ok: false, message: 'Pick a category.' }
  }

  // Check category exists
  const { data: category, error: categoryErr } = await supabase
    .from('categories')
    .select('id')
    .eq('id', input.category_id)
    .maybeSingle()
  if (categoryErr || !category) {
    return { ok: false, message: 'Category not found.' }
  }

  const { data: existingByDomain, error: domainErr } = await supabase
    .from('sites')
    .select('id')
    .eq('domain', domain)
    .maybeSingle()
  if (domainErr) {
    return { ok: false, message: domainErr.message ?? 'Could not validate domain uniqueness.' }
  }
  if (existingByDomain) {
    return { ok: false, message: 'A site with this domain already exists.' }
  }

  const row: Database['public']['Tables']['sites']['Insert'] = {
    domain,
    dr: input.dr,
    category_id: input.category_id,
    price: input.price,
    link_type: input.link_type,
    requirements: input.requirements?.trim() || null,
    description: input.description?.trim() || null,
    sourcer_notes: input.sourcer_notes?.trim() || null,
    contact_info: input.contact_info?.trim() || null,
    keywords_relevance: input.keywords_relevance?.trim() || null,
    organic_keywords_count: input.organic_keywords_count,
    organic_traffic_count: input.organic_traffic_count,
    top_countries: input.top_countries?.trim() || null,
  }

  const { data: inserted, error: insErr } = await supabase
    .from('sites')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (insErr || !inserted) {
    await logSiteError({
      context: 'site/create',
      message: insErr?.message ?? 'Could not create site.',
      userId: ctx.userId,
      payload: { domain, category_id: input.category_id },
    })
    return {
      ok: false,
      message: insErr?.message ?? 'Could not create site.',
    }
  }

  const siteId = inserted.id

  const { error: rpcErr } = await supabase.rpc('replace_site_countries_and_languages', {
    p_site_id: siteId,
    p_countries: countries,
    p_languages: languages,
  })

  if (rpcErr) {
    await supabase.from('sites').delete().eq('id', siteId)
    await logSiteError({
      context: 'site/create',
      message: rpcErr.message ?? 'Could not save countries/languages.',
      userId: ctx.userId,
      payload: { siteId, countries: countries.slice(0, 5), languages: languages.slice(0, 5) },
    })
    return { ok: false, message: rpcErr.message ?? 'Could not save countries/languages.' }
  }

  revalidatePath('/sites')
  revalidatePath(`/sites/${siteId}`)
  return { ok: true, siteId }
}

export async function updateSite(
  siteId: string,
  input: SiteListingPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) {
    return { ok: false, message: ctx.error }
  }
  const { supabase, userId, role } = ctx

  const domain = input.domain.trim().toLowerCase()
  if (!domain) {
    return { ok: false, message: 'Domain is required.' }
  }

  const countries = parseCodeList(input.countriesCsv).map((c) => c.toUpperCase())
  const languages = parseCodeList(input.languagesCsv).map((l) => l.toLowerCase())
  if (countries.length === 0) {
    return { ok: false, message: 'Add at least one country code.' }
  }
  if (languages.length === 0) {
    return { ok: false, message: 'Add at least one language code.' }
  }
  if (!countries.every(isValidCountryCode)) {
    return { ok: false, message: 'Invalid country code(s). Use ISO 3166-1 alpha-2 (e.g., US, GB).' }
  }
  if (!languages.every(isValidLanguageCode)) {
    return { ok: false, message: 'Invalid language code(s). Use ISO 639-1/3 (e.g., en, spa).' }
  }

  const eDr = reqNat('DR', input.dr)
  if (eDr) return { ok: false, message: eDr }
  if (input.dr > 100) {
    return { ok: false, message: 'DR cannot exceed 100.' }
  }

  const eOk = reqNat('Organic keywords count', input.organic_keywords_count)
  if (eOk) return { ok: false, message: eOk }
  const eOt = reqNat('Organic traffic count', input.organic_traffic_count)
  if (eOt) return { ok: false, message: eOt }

  const ePrice = reqPositiveMoney('Price', input.price)
  if (ePrice) return { ok: false, message: ePrice }

  if (!Number.isFinite(input.category_id) || input.category_id <= 0) {
    return { ok: false, message: 'Pick a category.' }
  }

  // Check category exists
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id')
    .eq('id', input.category_id)
    .maybeSingle()
  if (catErr || !cat) {
    return { ok: false, message: 'Category not found.' }
  }

  const { data: existing, error: loadErr } = await supabase
    .from('sites')
    .select('id, sourcer_id, status')
    .eq('id', siteId)
    .maybeSingle()

  if (loadErr || !existing) {
    return { ok: false, message: loadErr?.message ?? 'Site not found.' }
  }

  const { data: duplicate, error: duplicateErr } = await supabase
    .from('sites')
    .select('id')
    .eq('domain', domain)
    .neq('id', siteId)
    .maybeSingle()
  if (duplicateErr) {
    return { ok: false, message: duplicateErr.message ?? 'Could not validate domain uniqueness.' }
  }
  if (duplicate) {
    return { ok: false, message: 'A site with this domain already exists.' }
  }

  const canEdit =
    role === 'admin' ||
    (role === 'sourcer' && existing.sourcer_id === userId && existing.status !== 'archived')

  if (!canEdit) {
    return { ok: false, message: 'You cannot edit this site.' }
  }

  const patch: Database['public']['Tables']['sites']['Update'] = {
    domain,
    dr: input.dr,
    category_id: input.category_id,
    price: input.price,
    link_type: input.link_type,
    requirements: input.requirements?.trim() || null,
    description: input.description?.trim() || null,
    sourcer_notes: input.sourcer_notes?.trim() || null,
    contact_info: input.contact_info?.trim() || null,
    keywords_relevance: input.keywords_relevance?.trim() || null,
    organic_keywords_count: input.organic_keywords_count,
    organic_traffic_count: input.organic_traffic_count,
    top_countries: input.top_countries?.trim() || null,
  }

  if (role === 'admin') {
    const targetSourcerId = input.sourcer_id?.trim() || null
    if (targetSourcerId) {
      const { data: sourcerProfile, error: sourcerErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', targetSourcerId)
        .maybeSingle()
      if (sourcerErr || !sourcerProfile || sourcerProfile.role !== 'sourcer') {
        return { ok: false, message: 'Assigned sourcer not found.' }
      }
    }

    patch.sourcer_id = targetSourcerId

    // If admin reassigns sourcer, reset status to pending and clear audit fields
    if (targetSourcerId !== existing.sourcer_id) {
      patch.status = 'pending'
      patch.needs_changes_by = null
      patch.needs_changes_at = null
      patch.needs_changes_comment = null
      patch.approved_by = null
      patch.approved_at = null
    }
  }

  const { error: upErr } = await supabase.from('sites').update(patch).eq('id', siteId)

  if (upErr) {
    await logSiteError({
      context: 'site/update',
      message: upErr.message ?? 'Could not update site.',
      userId,
      payload: { siteId, domain, category_id: input.category_id },
    })
    return { ok: false, message: upErr.message ?? 'Could not update site.' }
  }

  const { error: rpcErr } = await supabase.rpc('replace_site_countries_and_languages', {
    p_site_id: siteId,
    p_countries: countries,
    p_languages: languages,
  })

  if (rpcErr) {
    await logSiteError({
      context: 'site/update',
      message: rpcErr.message ?? 'Could not update countries/languages.',
      userId,
      payload: { siteId, countries: countries.slice(0, 5), languages: languages.slice(0, 5) },
    })
    return { ok: false, message: rpcErr.message ?? 'Could not update countries/languages.' }
  }

  revalidatePath('/sites')
  revalidatePath(`/sites/${siteId}`)
  revalidatePath(`/sites/${siteId}/edit`)
  return { ok: true }
}

export type SiteAdminTransition = 'needs_changes' | 'approve' | 'archive' | 'unarchive'

const SITE_TRANSITION_NOTIFICATION: Record<
  SiteAdminTransition,
  {
    event: Database['public']['Enums']['notification_event']
    title: string
    message: (domain: string) => string
  }
> = {
  needs_changes: {
    event: 'site_needs_changes',
    title: 'Changes requested',
    message: (d) => `An admin requested changes on ${d}.`,
  },
  approve: {
    event: 'site_approved',
    title: 'Site approved',
    message: (d) => `${d} has been approved and is now active.`,
  },
  archive: {
    event: 'site_archived',
    title: 'Site archived',
    message: (d) => `${d} has been archived.`,
  },
  unarchive: {
    event: 'site_unarchived',
    title: 'Site activated',
    message: (d) => `${d} has been unarchived and is now active.`,
  },
}

export async function changeSiteStatus(params: {
  siteId: string
  transition: SiteAdminTransition
  /** Required (trimmed) when transition is needs_changes; ignored for other transitions. */
  comment?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) {
    return { ok: false, message: ctx.error }
  }
  const { userId, role } = ctx

  if (role !== 'admin' && role !== 'manager') {
    return { ok: false, message: 'Only admin or manager can change site status.' }
  }

  const commentTrimmed = params.comment?.trim() ?? ''
  if (params.transition === 'needs_changes' && !commentTrimmed) {
    return {
      ok: false,
      message: 'A comment is required when marking the listing as needs changes.',
    }
  }

  const nowIso = new Date().toISOString()

  let patch: Database['public']['Tables']['sites']['Update']

  switch (params.transition) {
    case 'needs_changes':
      patch = {
        status: 'needs_changes',
        needs_changes_by: userId,
        needs_changes_at: nowIso,
        needs_changes_comment: commentTrimmed,
        approved_by: null,
        approved_at: null,
      }
      break
    case 'approve':
      patch = {
        status: 'active',
        approved_by: userId,
        approved_at: nowIso,
        needs_changes_by: null,
        needs_changes_at: null,
        needs_changes_comment: null,
      }
      break
    case 'archive':
      patch = {
        status: 'archived',
        needs_changes_comment: null,
      }
      break
    case 'unarchive':
      patch = {
        status: 'active',
      }
      break
    default:
      return { ok: false, message: 'Unknown transition.' }
  }

  // Use service role for this mutation (RLS may block manager updates otherwise).
  const { error } = await adminClient.from('sites').update(patch).eq('id', params.siteId)

  if (error) {
    await logSiteError({
      context: 'site/change-status',
      message: error.message ?? 'Could not update status.',
      userId,
      payload: { siteId: params.siteId, transition: params.transition },
    })
    return { ok: false, message: error.message ?? 'Could not update status.' }
  }

  // Notify the sourcer (fire-and-forget)
  const { data: site } = await adminClient
    .from('sites')
    .select('sourcer_id, domain')
    .eq('id', params.siteId)
    .maybeSingle()

  if (site?.sourcer_id) {
    const meta = SITE_TRANSITION_NOTIFICATION[params.transition]
    const { error: notifErr } = await adminClient.from('notifications').insert({
      recipient_user_id: site.sourcer_id,
      actor_user_id: userId,
      event: meta.event,
      title: meta.title,
      message: meta.message(site.domain),
      site_id: params.siteId,
    })
    if (notifErr) {
      await logSiteError({
        level: 'warn',
        context: 'site/change-status/notification',
        message: notifErr.message ?? 'Could not create notification.',
        userId,
        payload: { siteId: params.siteId, transition: params.transition },
      })
    }
  }

  revalidatePath('/sites')
  revalidatePath(`/sites/${params.siteId}`)
  revalidatePath('/notifications')
  return { ok: true }
}

export async function addSiteToCart(
  siteId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()

  const [{ data: authData, error: authErr }, { data: cart }, { data: profile }] = await Promise.all(
    [
      supabase.auth.getUser(),
      supabase.from('carts').select('id').maybeSingle(),
      supabase.from('profiles').select('role').maybeSingle(),
    ]
  )

  if (authErr || !authData.user) return { ok: false, message: 'You must be signed in.' }
  if (profile?.role !== 'client') return { ok: false, message: 'Only clients use the cart.' }
  if (!cart) return { ok: false, message: 'Cart not found.' }

  const { error: itemErr } = await supabase.from('cart_items').insert({
    cart_id: cart.id,
    site_id: siteId,
  })

  if (itemErr) {
    return {
      ok: false,
      message:
        itemErr.code === '23505'
          ? 'This site is already in your cart.'
          : (itemErr.message ?? 'Could not add to cart.'),
    }
  }

  revalidatePath('/sites')
  revalidatePath('/cart')
  return { ok: true }
}
