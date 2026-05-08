import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

export type OrderContentDraft = {
  title: string
  meta_description: string
  body_html: string
  word_count: number
  updated_at: string
}

export type OrderContentSubmittedVersion = {
  id: string
  version_number: number
  title: string
  meta_description: string
  body_html: string
  word_count: number
  created_at: string
}

export type OrderContentBundle = {
  draft: OrderContentDraft | null
  submitted: OrderContentSubmittedVersion[]
}

/**
 * Reads the draft + every submitted version for an order. RLS controls what is
 * actually returned per role: copywriter (draft + their submitted), client
 * owner (submitted only), admin/manager (all). Used by the order detail page
 * to render the editor and/or the read-only viewer.
 */
export async function loadOrderContent(
  supabase: SupabaseClient<Database>,
  orderId: string
): Promise<OrderContentBundle> {
  const { data, error } = await supabase
    .from('order_content_versions')
    .select(
      'id, status, version_number, title, meta_description, body_html, word_count, created_at, updated_at'
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[orders/load-content]', error.message)
    return { draft: null, submitted: [] }
  }

  const rows = data ?? []
  const draftRow = rows.find((r) => r.status === 'draft') ?? null
  const submitted = rows
    .filter((r) => r.status === 'submitted' && r.version_number !== null)
    .map((r) => ({
      id: r.id,
      version_number: r.version_number as number,
      title: r.title,
      meta_description: r.meta_description,
      body_html: r.body_html,
      word_count: r.word_count,
      created_at: r.created_at,
    }))
    .sort((a, b) => b.version_number - a.version_number)

  const draft: OrderContentDraft | null = draftRow
    ? {
        title: draftRow.title,
        meta_description: draftRow.meta_description,
        body_html: draftRow.body_html,
        word_count: draftRow.word_count,
        updated_at: draftRow.updated_at,
      }
    : null

  return { draft, submitted }
}
