'use server'

import { revalidatePath } from 'next/cache'

import { isOwnAvatarsPublicObjectUrl } from '@/lib/profile/avatar-storage-path'
import { createClient } from '@/lib/supabase/server'

export type UpdateOwnProfileResult = { ok: true } | { ok: false; message: string }

/** Only keys present are written — omit a field to leave it unchanged. */
export type OwnProfilePatch = Partial<{
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  company_name: string | null
  phone: string | null
}>

export async function updateOwnProfile(patch: OwnProfilePatch): Promise<UpdateOwnProfileResult> {
  const updates: OwnProfilePatch = {}
  if (patch.full_name !== undefined) updates.full_name = patch.full_name
  if (patch.avatar_url !== undefined) updates.avatar_url = patch.avatar_url
  if (patch.bio !== undefined) updates.bio = patch.bio
  if (patch.company_name !== undefined) updates.company_name = patch.company_name
  if (patch.phone !== undefined) updates.phone = patch.phone

  if (Object.keys(updates).length === 0) {
    return { ok: false, message: 'Nothing to update.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, message: 'You must be signed in.' }
  }

  if (patch.avatar_url !== undefined && patch.avatar_url !== null) {
    if (!isOwnAvatarsPublicObjectUrl(user.id, patch.avatar_url)) {
      return { ok: false, message: 'Avatar must use an image from your account storage.' }
    }
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)

  if (error) {
    return { ok: false, message: error.message || 'Could not update profile.' }
  }

  revalidatePath('/settings/profile')
  /** Refresh `(app)/layout` chrome (header avatar, etc.) — page-only revalidation leaves shell stale. */
  revalidatePath('/settings/profile', 'layout')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/')
  return { ok: true }
}
