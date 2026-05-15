import { describe, expect, it } from 'vitest'

import { isValidEmail, normalizeEmail } from '@/lib/validation/email'

describe('isValidEmail', () => {
  it('accepts standard email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
  })

  it('rejects missing @', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
  })

  it('rejects missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false)
  })

  it('rejects missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('rejects string shorter than 5 characters', () => {
    expect(isValidEmail('a@b.')).toBe(false)
  })

  it('rejects string longer than 254 characters', () => {
    const local = 'a'.repeat(244)
    expect(isValidEmail(`${local}@example.com`)).toBe(false)
  })

  it('trims before validating', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('rejects plain text with no domain structure', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('lowercases the email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com')
  })

  it('returns already-normalized email unchanged', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com')
  })
})
