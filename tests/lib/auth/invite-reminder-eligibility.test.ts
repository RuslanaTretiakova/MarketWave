import { describe, expect, it } from 'vitest'

import {
  isAuthUserBanned,
  isCooldownRespected,
  isMinUserAgeMet,
  isProfileRowCronCandidate,
  shouldSendInviteReminder,
  shouldSkipAlreadyActiveUser,
} from '@/lib/auth/invite-reminder-eligibility'

const baseProfile = {
  require_password_change: true,
  role: 'client',
  email: 'a@b.co',
  last_automated_invite_reminder_at: null as string | null,
}

const baseAuth = {
  last_sign_in_at: null as string | null,
  banned_until: null as string | null,
  created_at: '2020-01-01T00:00:00.000Z',
}

describe('isProfileRowCronCandidate', () => {
  it('rejects non-invited and admin', () => {
    expect(isProfileRowCronCandidate({ ...baseProfile, require_password_change: false })).toBe(
      false
    )
    expect(isProfileRowCronCandidate({ ...baseProfile, role: 'admin' })).toBe(false)
    expect(isProfileRowCronCandidate({ ...baseProfile, email: '' })).toBe(false)
    expect(isProfileRowCronCandidate({ ...baseProfile, email: 'bad' })).toBe(false)
  })

  it('accepts invited non-admin with email', () => {
    expect(isProfileRowCronCandidate(baseProfile)).toBe(true)
  })
})

describe('isAuthUserBanned', () => {
  it('detects active ban', () => {
    const now = new Date('2030-06-01T00:00:00.000Z')
    expect(isAuthUserBanned('2030-12-01T00:00:00.000Z', now)).toBe(true)
    expect(isAuthUserBanned('2029-01-01T00:00:00.000Z', now)).toBe(false)
    expect(isAuthUserBanned(null, now)).toBe(false)
  })
})

describe('shouldSkipAlreadyActiveUser', () => {
  it('skips when signed in and no password change required', () => {
    expect(shouldSkipAlreadyActiveUser('2025-01-01T00:00:00.000Z', false)).toBe(true)
  })

  it('does not skip invited-with-signin edge or never signed in', () => {
    expect(shouldSkipAlreadyActiveUser(null, false)).toBe(false)
    expect(shouldSkipAlreadyActiveUser('2025-01-01T00:00:00.000Z', true)).toBe(false)
    expect(shouldSkipAlreadyActiveUser(null, true)).toBe(false)
  })
})

describe('isCooldownRespected', () => {
  const nowMs = new Date('2030-06-15T12:00:00.000Z').getTime()

  it('allows when no prior reminder', () => {
    expect(isCooldownRespected(null, nowMs, 7)).toBe(true)
  })

  it('respects 7-day window', () => {
    const recent = new Date('2030-06-14T12:00:00.000Z').toISOString()
    const old = new Date('2030-06-01T12:00:00.000Z').toISOString()
    expect(isCooldownRespected(recent, nowMs, 7)).toBe(false)
    expect(isCooldownRespected(old, nowMs, 7)).toBe(true)
  })
})

describe('isMinUserAgeMet', () => {
  const nowMs = new Date('2030-06-03T12:00:00.000Z').getTime()

  it('requires created_at and hours elapsed', () => {
    expect(isMinUserAgeMet(null, nowMs, 48)).toBe(false)
    expect(isMinUserAgeMet('2030-06-03T11:00:00.000Z', nowMs, 48)).toBe(false)
    expect(isMinUserAgeMet('2030-06-01T00:00:00.000Z', nowMs, 48)).toBe(true)
  })
})

describe('shouldSendInviteReminder', () => {
  const nowMs = new Date('2030-06-10T12:00:00.000Z').getTime()

  it('allows first reminder when min age met', () => {
    const r = shouldSendInviteReminder({
      profile: baseProfile,
      auth: {
        ...baseAuth,
        created_at: '2030-06-01T00:00:00.000Z',
      },
      nowMs,
      cooldownDays: 7,
      minUserAgeHours: 48,
    })
    expect(r).toEqual({ ok: true })
  })

  it('blocks first reminder when too young', () => {
    const r = shouldSendInviteReminder({
      profile: baseProfile,
      auth: {
        ...baseAuth,
        created_at: '2030-06-10T00:00:00.000Z',
      },
      nowMs,
      cooldownDays: 7,
      minUserAgeHours: 48,
    })
    expect(r).toEqual({ ok: false, reason: 'min_user_age' })
  })

  it('blocks repeat under cooldown', () => {
    const r = shouldSendInviteReminder({
      profile: {
        ...baseProfile,
        last_automated_invite_reminder_at: '2030-06-09T12:00:00.000Z',
      },
      auth: baseAuth,
      nowMs,
      cooldownDays: 7,
      minUserAgeHours: 48,
    })
    expect(r).toEqual({ ok: false, reason: 'cooldown' })
  })

  it('allows repeat after cooldown', () => {
    const r = shouldSendInviteReminder({
      profile: {
        ...baseProfile,
        last_automated_invite_reminder_at: '2030-06-01T12:00:00.000Z',
      },
      auth: baseAuth,
      nowMs,
      cooldownDays: 7,
      minUserAgeHours: 48,
    })
    expect(r).toEqual({ ok: true })
  })

  it('blocks banned', () => {
    const r = shouldSendInviteReminder({
      profile: baseProfile,
      auth: {
        ...baseAuth,
        banned_until: '2030-12-01T00:00:00.000Z',
      },
      nowMs,
      cooldownDays: 7,
      minUserAgeHours: 48,
    })
    expect(r).toEqual({ ok: false, reason: 'banned' })
  })
})
