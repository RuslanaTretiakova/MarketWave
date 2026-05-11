/** Inputs derived from `profiles` for automated invite reminders. */
export type InviteReminderProfileInput = {
  require_password_change: boolean
  role: string
  email: string | null
  last_automated_invite_reminder_at: string | null
}

/** Inputs derived from Supabase Auth `User` for automated invite reminders. */
export type InviteReminderAuthInput = {
  last_sign_in_at: string | null
  banned_until: string | null
  created_at: string | null
}

export function isProfileRowCronCandidate(p: InviteReminderProfileInput): boolean {
  if (!p.require_password_change) return false
  if (p.role === 'admin') return false
  const email = p.email?.trim() ?? ''
  return email.length > 0 && email.includes('@')
}

export function isAuthUserBanned(bannedUntil: string | null, now: Date): boolean {
  if (!bannedUntil) return false
  return new Date(bannedUntil) > now
}

/** Same guard as manual resend: skip fully active users if profile were ever inconsistent. */
export function shouldSkipAlreadyActiveUser(
  lastSignInAt: string | null,
  requirePasswordChange: boolean
): boolean {
  return Boolean(lastSignInAt) && !requirePasswordChange
}

export function isCooldownRespected(
  lastReminderAt: string | null,
  nowMs: number,
  cooldownDays: number
): boolean {
  if (!lastReminderAt) return true
  const last = new Date(lastReminderAt).getTime()
  if (!Number.isFinite(last)) return true
  const daysMs = cooldownDays * 24 * 60 * 60 * 1000
  return nowMs - last >= daysMs
}

export function isMinUserAgeMet(
  userCreatedAtIso: string | null,
  nowMs: number,
  minHours: number
): boolean {
  if (!userCreatedAtIso) return false
  const created = new Date(userCreatedAtIso).getTime()
  if (!Number.isFinite(created)) return false
  const minMs = minHours * 60 * 60 * 1000
  return nowMs - created >= minMs
}

export function shouldSendInviteReminder(args: {
  profile: InviteReminderProfileInput
  auth: InviteReminderAuthInput
  nowMs: number
  cooldownDays: number
  minUserAgeHours: number
}): { ok: true } | { ok: false; reason: string } {
  const { profile, auth, nowMs, cooldownDays, minUserAgeHours } = args

  if (!isProfileRowCronCandidate(profile)) {
    return { ok: false, reason: 'not_candidate' }
  }

  if (isAuthUserBanned(auth.banned_until, new Date(nowMs))) {
    return { ok: false, reason: 'banned' }
  }

  if (shouldSkipAlreadyActiveUser(auth.last_sign_in_at, profile.require_password_change)) {
    return { ok: false, reason: 'already_active' }
  }

  if (profile.last_automated_invite_reminder_at == null) {
    if (!isMinUserAgeMet(auth.created_at, nowMs, minUserAgeHours)) {
      return { ok: false, reason: 'min_user_age' }
    }
  } else if (!isCooldownRespected(profile.last_automated_invite_reminder_at, nowMs, cooldownDays)) {
    return { ok: false, reason: 'cooldown' }
  }

  return { ok: true }
}

export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[name]?.trim() : undefined
  if (!raw) return fallback
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function readNonNegativeIntEnv(name: string, fallback: number): number {
  const raw = typeof process !== 'undefined' ? process.env[name]?.trim() : undefined
  if (!raw) return fallback
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}
