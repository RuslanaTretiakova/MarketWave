/** Strip ILIKE wildcard characters from user input so filters cannot broaden matches. */
export function sanitizeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '').trim()
}
