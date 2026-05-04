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
