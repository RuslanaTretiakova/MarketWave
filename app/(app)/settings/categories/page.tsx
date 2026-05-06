import { notFound } from 'next/navigation'

import { CategoriesManagement } from '@/components/settings/categories-management'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Categories',
}

type SearchParams = {
  page?: string
  q?: string
}

export default async function SettingsCategoriesPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const { page: pageRaw, q: qRaw } = await props.searchParams

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

  if (profile?.role !== 'admin') {
    notFound()
  }

  const q = typeof qRaw === 'string' ? qRaw.trim() : ''
  const pageParsed = Math.max(1, Math.floor(Number(pageRaw)) || 1)

  const safeQ = sanitizeIlikePattern(q)

  function buildQuery() {
    let qb = supabase
      .from('categories')
      .select('id, name, created_at', { count: 'exact' })
      .order('name', { ascending: true })
    if (safeQ.length > 0) {
      const pat = `%${safeQ}%`
      qb = qb.or(`name.ilike.${pat},slug.ilike.${pat}`)
    }
    return qb
  }

  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  let page = pageParsed
  let rows = null as { id: number; name: string; created_at: string }[] | null
  let totalCount = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await buildQuery().range(from, to)

    if (error) {
      console.error('[settings/categories] load categories', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      throw new Error(
        `Failed to load categories: ${error.message || error.code || 'unknown error'}`
      )
    }

    totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) {
      page = totalPages
      continue
    }
    rows = data
    break
  }

  return (
    <CategoriesManagement
      initialRows={rows ?? []}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      q={q}
    />
  )
}
