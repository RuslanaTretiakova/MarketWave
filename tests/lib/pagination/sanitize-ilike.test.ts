import { describe, expect, it } from 'vitest'

import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'

describe('sanitizeIlikePattern', () => {
  it('returns plain string unchanged', () => {
    expect(sanitizeIlikePattern('hello')).toBe('hello')
  })

  it('strips % wildcard', () => {
    expect(sanitizeIlikePattern('hel%lo')).toBe('hello')
    expect(sanitizeIlikePattern('%foo%')).toBe('foo')
  })

  it('strips _ wildcard', () => {
    expect(sanitizeIlikePattern('hel_lo')).toBe('hello')
    expect(sanitizeIlikePattern('_foo_')).toBe('foo')
  })

  it('strips backslash', () => {
    expect(sanitizeIlikePattern('foo\\bar')).toBe('foobar')
  })

  it('strips combinations of wildcards', () => {
    expect(sanitizeIlikePattern('%foo_bar\\baz%')).toBe('foobarbaz')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeIlikePattern('  hello  ')).toBe('hello')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeIlikePattern('')).toBe('')
  })

  it('returns empty string for wildcard-only input', () => {
    expect(sanitizeIlikePattern('%_%\\')).toBe('')
  })
})
