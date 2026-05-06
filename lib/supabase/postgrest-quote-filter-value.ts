/**
 * Double-quote a literal for embedding in manual PostgREST filter strings passed to `.or()`
 * (e.g. `column.ilike.<this>`). Without quoting, values containing `.`, `,`, `:`, `()`, etc. break parsing.
 *
 * Prefer normal filter methods where supabase-js encodes values for you — use this only for raw `.or()` strings.
 */
export function quotePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}
