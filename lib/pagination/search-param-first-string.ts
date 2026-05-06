/** First value when Next.js resolves a repeated query key as `string[]`. */
export function searchParamFirstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v[0] : v
}
