import { adminClient } from '@/lib/supabase/admin'

const MAX_BUCKET_BYTES = 2097152
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

/** Ensure public `avatars` bucket exists (matches migration defaults). Uses service role — server-only. */
export async function ensureAvatarsBucket(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      message:
        'SUPABASE_SERVICE_ROLE_KEY is not set on the server — avatar uploads cannot create storage.',
    }
  }

  const { data: buckets, error: listErr } = await adminClient.storage.listBuckets()
  if (listErr) {
    return { ok: false, message: listErr.message }
  }

  if (buckets?.some((b) => b.id === 'avatars' || b.name === 'avatars')) {
    return { ok: true }
  }

  const { error: createErr } = await adminClient.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: MAX_BUCKET_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME],
  })

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? ''
    if (msg.includes('already') || msg.includes('exists')) {
      return { ok: true }
    }
    return { ok: false, message: createErr.message }
  }

  return { ok: true }
}
