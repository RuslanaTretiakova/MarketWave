import { describe, expect, it } from 'vitest'

import { confirmMatches, meetsMinLength, trimPasswordInput } from '@/lib/auth/password-validation'

describe('trimPasswordInput', () => {
  it('trims surrounding whitespace', () => {
    expect(trimPasswordInput('  secret  ')).toBe('secret')
  })

  it('leaves internal spaces untouched', () => {
    expect(trimPasswordInput('my pass word')).toBe('my pass word')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(trimPasswordInput('   ')).toBe('')
  })
})

describe('meetsMinLength', () => {
  it('accepts password of exactly 8 characters', () => {
    expect(meetsMinLength('12345678')).toBe(true)
  })

  it('accepts password longer than 8 characters', () => {
    expect(meetsMinLength('supersecretpassword')).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    expect(meetsMinLength('1234567')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(meetsMinLength('')).toBe(false)
  })
})

describe('confirmMatches', () => {
  it('returns true when password and confirm are identical and non-empty', () => {
    expect(confirmMatches('password1', 'password1')).toBe(true)
  })

  it('returns false when values differ', () => {
    expect(confirmMatches('password1', 'password2')).toBe(false)
  })

  it('returns false when both are empty strings', () => {
    expect(confirmMatches('', '')).toBe(false)
  })

  it('returns false when one is empty', () => {
    expect(confirmMatches('password1', '')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(confirmMatches('Password', 'password')).toBe(false)
  })
})
