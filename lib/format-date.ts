const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function ordinalSuffix(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (n % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** "1st Sep 2025" */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getDate()
  return `${day}${ordinalSuffix(day)} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "1st Sep 2025, 14:30" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}${ordinalSuffix(day)} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

/** "1st Sep 2025, 14:30 UTC" — for invoice/audit timestamps that must show UTC */
export function formatDateTimeUtc(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getUTCDate()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day}${ordinalSuffix(day)} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`
}

/** "Sep 2025" — for billing month labels (no day). Pass utc=true for date-only ISO strings. */
export function formatMonthYear(iso: string | null | undefined, utc = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const month = utc ? d.getUTCMonth() : d.getMonth()
  const year = utc ? d.getUTCFullYear() : d.getFullYear()
  return `${MONTHS_SHORT[month]} ${year}`
}
