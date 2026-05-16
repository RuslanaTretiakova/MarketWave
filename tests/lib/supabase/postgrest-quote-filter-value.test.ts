import { describe, expect, it } from 'vitest'

import { quotePostgrestFilterValue } from '@/lib/supabase/postgrest-quote-filter-value'

describe('quotePostgrestFilterValue', () => {
  it('wraps plain string in double quotes', () => {
    expect(quotePostgrestFilterValue('hello')).toBe('"hello"')
  })

  it('escapes double quotes inside value', () => {
    expect(quotePostgrestFilterValue('say "hi"')).toBe('"say \\"hi\\""')
  })

  it('escapes backslashes', () => {
    expect(quotePostgrestFilterValue('a\\b')).toBe('"a\\\\b"')
  })

  it('escapes backslash before double quote', () => {
    expect(quotePostgrestFilterValue('a\\"b')).toBe('"a\\\\\\"b"')
  })

  it('handles empty string', () => {
    expect(quotePostgrestFilterValue('')).toBe('""')
  })

  it('handles strings with dots and commas that break raw PostgREST filters', () => {
    const out = quotePostgrestFilterValue('example.com,other')
    expect(out).toBe('"example.com,other"')
  })

  it('handles strings with parentheses and colons', () => {
    const out = quotePostgrestFilterValue('(key:value)')
    expect(out).toBe('"(key:value)"')
  })

  it('handles unicode characters without modification', () => {
    expect(quotePostgrestFilterValue('héllo')).toBe('"héllo"')
  })
})
