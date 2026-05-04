/** True when `url` is this project's public avatars object for `userId` (path `userId/...`). */
export function isOwnAvatarsPublicObjectUrl(userId: string, url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '').trim()
  if (!base) return false
  const trimmed = url.trim()
  if (!trimmed.startsWith(`${base}/`)) return false
  const path = avatarObjectPathFromPublicUrl(trimmed)
  if (!path) return false
  return path === userId || path.startsWith(`${userId}/`)
}

/** Extract `avatars` object key from a Supabase public object URL, if applicable. */
export function avatarObjectPathFromPublicUrl(url: string): string | null {
  const marker = '/object/public/avatars/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  const rest = url
    .slice(i + marker.length)
    .split('?')[0]
    ?.trim()
  if (!rest) return null
  try {
    return decodeURIComponent(rest)
  } catch {
    return rest
  }
}
