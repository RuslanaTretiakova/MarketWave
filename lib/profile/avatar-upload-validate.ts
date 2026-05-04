/** Shared rules for profile avatar uploads (client + server). */

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const ACCEPT_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const ACCEPT_AVATAR_ATTR = ACCEPT_AVATAR_TYPES.join(',')

export function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

function inferMimeFromFilename(name: string): string | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return null
}

/** Storage validates MIME; Windows often yields empty `File.type` — infer from extension and normalize. */
export function normalizeImageFileForUpload(file: File): { file: File; mime: string } | null {
  const mime =
    file.type && (ACCEPT_AVATAR_TYPES as readonly string[]).includes(file.type)
      ? file.type
      : inferMimeFromFilename(file.name)
  if (!mime || !(ACCEPT_AVATAR_TYPES as readonly string[]).includes(mime)) return null
  if (file.type === mime) return { file, mime }
  return { file: new File([file], file.name, { type: mime }), mime }
}
