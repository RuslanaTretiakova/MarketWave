/** Compact “last active” strings for admin user lists (matches common dashboard copy). */
export function formatRelativeLastActive(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—'
  const date = new Date(iso)
  const ms = Date.now() - date.getTime()
  if (!Number.isFinite(ms)) return '—'
  if (ms < 45_000) return 'Just now'
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  if (min < 60) return min <= 1 ? '1 min ago' : `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return h === 1 ? '1 h ago' : `${h} h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return date.toLocaleDateString()
}
