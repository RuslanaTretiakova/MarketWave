'use server'

import { randomUUID } from 'node:crypto'

import { avatarObjectPathFromPublicUrl } from '@/lib/profile/avatar-storage-path'
import { ensureAvatarsBucket } from '@/lib/profile/ensure-avatars-bucket'
import {
  extFromMime,
  MAX_AVATAR_BYTES,
  normalizeImageFileForUpload,
} from '@/lib/profile/avatar-upload-validate'
import { updateOwnProfile } from '@/lib/profile/update-own-profile'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type UploadOwnAvatarResult = { ok: true; publicUrl: string } | { ok: false; message: string }

export async function uploadOwnAvatar(file: File): Promise<UploadOwnAvatarResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, message: 'You must be signed in.' }
  }

  const normalized = normalizeImageFileForUpload(file)
  if (!normalized) {
    return { ok: false, message: 'Choose an image file (JPEG, PNG, WebP, or GIF).' }
  }

  const { file: uploadBody, mime } = normalized
  if (uploadBody.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: 'Image must be 2MB or smaller.' }
  }

  const ensured = await ensureAvatarsBucket()
  if (!ensured.ok) {
    return { ok: false, message: ensured.message }
  }

  const path = `${user.id}/${randomUUID()}.${extFromMime(mime)}`
  const { error: upErr } = await adminClient.storage.from('avatars').upload(path, uploadBody, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  })

  if (upErr) {
    return { ok: false, message: upErr.message || 'Upload failed.' }
  }

  const { data: pub } = adminClient.storage.from('avatars').getPublicUrl(path)
  const nextAvatar = pub.publicUrl

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const prevStoredAvatarUrl = profileRow?.avatar_url?.trim() ? profileRow.avatar_url.trim() : null

  const res = await updateOwnProfile({ avatar_url: nextAvatar })
  if (!res.ok) {
    await adminClient.storage.from('avatars').remove([path])
    return { ok: false, message: res.message }
  }

  if (prevStoredAvatarUrl) {
    const oldPath = avatarObjectPathFromPublicUrl(prevStoredAvatarUrl)
    if (oldPath) await adminClient.storage.from('avatars').remove([oldPath])
  }

  return { ok: true, publicUrl: nextAvatar }
}

export async function removeOwnAvatar(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, message: 'You must be signed in.' }
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const prev = profileRow?.avatar_url?.trim() ? profileRow.avatar_url.trim() : null

  const res = await updateOwnProfile({ avatar_url: null })
  if (!res.ok) {
    return { ok: false, message: res.message }
  }

  if (prev && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    const oldPath = avatarObjectPathFromPublicUrl(prev)
    if (oldPath) await adminClient.storage.from('avatars').remove([oldPath])
  }

  return { ok: true }
}
