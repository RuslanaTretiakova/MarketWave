'use client'

import { avatarInitialsFromProfile } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

const AVATAR_RING = [
  'bg-teal-500/20 text-teal-950 dark:text-teal-100',
  'bg-orange-500/15 text-orange-950 dark:text-orange-100',
  'bg-amber-400/20 text-amber-950 dark:text-amber-50',
  'bg-primary-soft text-primary-ink',
  'bg-muted text-foreground',
] as const

function hueIndex(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return h % AVATAR_RING.length
}

export function UserAvatar({
  fullName,
  email,
  className,
}: {
  fullName: string | null
  email: string
  className?: string
}) {
  const initials = avatarInitialsFromProfile(fullName, email)
  const ring = AVATAR_RING[hueIndex(email || fullName || 'user')]
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        ring,
        className
      )}
    >
      {initials}
    </span>
  )
}
