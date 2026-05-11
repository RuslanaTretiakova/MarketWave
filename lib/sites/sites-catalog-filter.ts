/** Sentinel for “all / any” options in catalog filter selects (Base UI disallows empty `SelectItem` values). */
export const SITES_CATALOG_FILTER_SENTINEL = '__all' as const

export function isSitesCatalogFilterAbsent(raw: string | undefined): boolean {
  if (raw === undefined) return true
  const t = raw.trim()
  return t === '' || t === SITES_CATALOG_FILTER_SENTINEL
}

/** Returns `null` when the query param should be omitted. */
export function sitesCatalogQueryValueForUrl(raw: string): string | null {
  const t = raw.trim()
  if (t === '' || t === SITES_CATALOG_FILTER_SENTINEL) return null
  return t
}
