'use server'

import { revalidatePath } from 'next/cache'

import { logDbError, mapDbError } from '@/lib/errors/map-db-error'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

async function assertAdmin(): Promise<{ userId: string } | { error: string }> {
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
  if (profErr || profile?.role !== 'admin') {
    return { error: 'Only an organization admin can do this.' }
  }
  return { userId: user.id }
}

/** Lowercase slug from display name; empty input becomes `category`. */
function nameToSlug(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s.length > 0 ? s : 'category'
}

async function nextAvailableSlug(
  supabase: SupabaseClient<Database>,
  base: string,
  excludeCategoryId?: number
): Promise<string> {
  let candidate = base.length > 0 ? base : 'category'
  let suffix = 2
  for (;;) {
    const { data: row, error } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error) {
      throw new Error(error.message)
    }
    if (!row || (excludeCategoryId !== undefined && row.id === excludeCategoryId)) {
      return candidate
    }
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

export async function createCategory(input: {
  name: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const trimmed = input.name.trim()
  if (!trimmed) {
    return { ok: false, message: 'Name is required.' }
  }

  const supabase = await createClient()
  const base = nameToSlug(trimmed)
  let slug: string
  try {
    slug = await nextAvailableSlug(supabase, base)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not allocate slug.' }
  }

  /* Omit `created_by`: column may be absent until migration; when present, trigger sets it from auth.uid(). */
  const { error } = await supabase.from('categories').insert({
    name: trimmed,
    slug,
  })

  if (error) {
    void logDbError({ context: 'categories/create', error, userId: gate.userId })
    return {
      ok: false,
      message: mapDbError(error, {
        unique_violation: 'A category with this name or slug already exists.',
      }).message,
    }
  }

  revalidatePath('/settings/categories')
  return { ok: true }
}

export async function updateCategory(input: {
  id: number
  name: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const trimmed = input.name.trim()
  if (!trimmed) {
    return { ok: false, message: 'Name is required.' }
  }

  const supabase = await createClient()
  const base = nameToSlug(trimmed)
  let slug: string
  try {
    slug = await nextAvailableSlug(supabase, base, input.id)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not allocate slug.' }
  }

  const { error } = await supabase
    .from('categories')
    .update({ name: trimmed, slug })
    .eq('id', input.id)

  if (error) {
    void logDbError({ context: 'categories/update', error, userId: gate.userId })
    return {
      ok: false,
      message: mapDbError(error, {
        unique_violation: 'A category with this name or slug already exists.',
      }).message,
    }
  }

  revalidatePath('/settings/categories')
  return { ok: true }
}
