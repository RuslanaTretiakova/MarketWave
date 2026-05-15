import { describe, expect, it } from 'vitest'

import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'

describe('searchParamFirstString', () => {
  it('returns undefined for undefined input', () => {
    expect(searchParamFirstString(undefined)).toBeUndefined()
  })

  it('returns the string directly when given a string', () => {
    expect(searchParamFirstString('hello')).toBe('hello')
  })

  it('returns the first element of an array', () => {
    expect(searchParamFirstString(['first', 'second', 'third'])).toBe('first')
  })

  it('returns the only element of a single-element array', () => {
    expect(searchParamFirstString(['only'])).toBe('only')
  })

  it('returns undefined for empty array', () => {
    expect(searchParamFirstString([])).toBeUndefined()
  })

  it('returns empty string when first element is empty', () => {
    expect(searchParamFirstString(['', 'other'])).toBe('')
  })
})
