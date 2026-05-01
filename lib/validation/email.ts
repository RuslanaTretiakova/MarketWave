const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export function isValidEmail(value: string): boolean {
  const t = value.trim()
  if (t.length < 5 || t.length > 254) return false
  return EMAIL_RE.test(t)
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
