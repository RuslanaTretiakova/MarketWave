import { describe, expect, it } from 'vitest'

import { avatarInitialsFromProfile, splitDisplayName } from '@/lib/user-display-name'

describe('splitDisplayName', () => {
  it('splits full name into first and last', () => {
    expect(splitDisplayName('Jane Doe', 'j@e.com')).toEqual({ first: 'Jane', last: 'Doe' })
  })

  it('handles multi-word last name', () => {
    expect(splitDisplayName('Mary Van Doe', 'm@e.com')).toEqual({ first: 'Mary', last: 'Van Doe' })
  })

  it('handles single name with no space', () => {
    expect(splitDisplayName('Cher', 'c@e.com')).toEqual({ first: 'Cher', last: '' })
  })

  it('falls back to email local part segments when no full name', () => {
    const result = splitDisplayName(null, 'jane.doe@example.com')
    expect(result.first).toBe('jane')
    expect(result.last).toBe('doe')
  })

  it('falls back to full local part when no segments', () => {
    const result = splitDisplayName(null, 'janedoe@example.com')
    expect(result.first).toBe('janedoe')
    expect(result.last).toBe('')
  })

  it('uses email itself as fallback for malformed input', () => {
    const result = splitDisplayName(null, 'nodomain')
    expect(result.first).toBeTruthy()
    expect(result.last).toBe('')
  })

  it('treats empty string full name as null (falls back to email)', () => {
    const result = splitDisplayName('', 'jane.doe@example.com')
    expect(result.first).toBe('jane')
  })

  it('trims whitespace from full name', () => {
    const result = splitDisplayName('  Jane Doe  ', 'j@e.com')
    expect(result).toEqual({ first: 'Jane', last: 'Doe' })
  })
})

describe('avatarInitialsFromProfile', () => {
  it('uses first and last initials from full name', () => {
    expect(avatarInitialsFromProfile('Jane Doe', 'j@e.com')).toBe('JD')
  })

  it('handles three-word names using first and last word initials', () => {
    expect(avatarInitialsFromProfile('Mary Van Doe', 'm@e.com')).toBe('MD')
  })

  it('uses first initial + email second segment for single name', () => {
    expect(avatarInitialsFromProfile('Jane', 'jane.doe@example.com')).toBe('JD')
  })

  it('uses first two chars of single name when no email segment available', () => {
    expect(avatarInitialsFromProfile('Cher', 'cher@example.com')).toBe('CH')
  })

  it('falls back to email segments when full name is null', () => {
    expect(avatarInitialsFromProfile(null, 'jane.doe@example.com')).toBe('JD')
  })

  it('uses two chars of email local when single segment', () => {
    expect(avatarInitialsFromProfile(null, 'janedoe@example.com')).toBe('JA')
  })

  it('returns ? for empty/malformed email with no name', () => {
    expect(avatarInitialsFromProfile(null, '@')).toBe('?')
  })

  it('uppercases initials', () => {
    expect(avatarInitialsFromProfile('alice bob', 'a@e.com')).toBe('AB')
  })
})
