function emailLocalSegments(email: string): string[] {
  const local = email.split('@')[0]?.trim() ?? ''
  if (!local) return []
  return local.split(/[._-]+/).filter(Boolean)
}

function initialsFromEmailLocal(email: string): string {
  const segments = emailLocalSegments(email)
  if (segments.length >= 2) {
    return (
      segments[0]!.charAt(0).toUpperCase() + segments[segments.length - 1]!.charAt(0).toUpperCase()
    )
  }
  const one = segments[0] ?? ''
  if (one.length >= 2) return one.slice(0, 2).toUpperCase()
  if (one.length === 1) return one.toUpperCase()
  return '?'
}

function secondInitialFromEmailLocal(email: string): string {
  const segments = emailLocalSegments(email)
  if (segments.length >= 2) {
    return segments[segments.length - 1]!.charAt(0).toUpperCase()
  }
  return ''
}

/** Two-letter (or one) initials for avatars — uses last word of full name, then email local-part segments. */
export function avatarInitialsFromProfile(fullName: string | null, email: string): string {
  const trimmed = fullName?.trim()
  if (trimmed) {
    const words = trimmed.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return words[0]!.charAt(0).toUpperCase() + words[words.length - 1]!.charAt(0).toUpperCase()
    }
    if (words.length === 1) {
      const a = words[0]!.charAt(0).toUpperCase()
      const fromEmail = secondInitialFromEmailLocal(email)
      if (fromEmail) return a + fromEmail
      const w = words[0]!
      if (w.length >= 2) return w.slice(0, 2).toUpperCase()
      return a || '?'
    }
  }
  return initialsFromEmailLocal(email)
}

/** Parse profile + email into given-name and family-name parts for display. */
export function splitDisplayName(
  fullName: string | null,
  email: string
): { first: string; last: string } {
  const trimmed = fullName?.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return { first: parts[0] ?? '', last: '' }
    return { first: parts[0] ?? '', last: parts.slice(1).join(' ') }
  }
  const segments = emailLocalSegments(email)
  if (segments.length >= 2) {
    return { first: segments[0]!, last: segments.slice(1).join(' ') }
  }
  return { first: segments[0] ?? email.split('@')[0] ?? email, last: '' }
}
