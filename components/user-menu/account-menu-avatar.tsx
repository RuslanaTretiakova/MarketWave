'use client'

import Image from 'next/image'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export function normalizeAccountAvatarUrl(url: string | null | undefined): string | null {
  const t = url?.trim()
  return t ? t : null
}

export function AccountMenuAvatar({
  avatarUrl,
  initials,
  sizeClass = 'size-10',
}: {
  avatarUrl: string | null
  initials: string
  sizeClass?: string
}) {
  const [imgBroken, setImgBroken] = useState(false)

  const resolved = normalizeAccountAvatarUrl(avatarUrl)
  if (resolved && !imgBroken) {
    return (
      <Image
        src={resolved}
        alt=""
        width={40}
        height={40}
        decoding="async"
        className={cn('pointer-events-none shrink-0 rounded-full object-cover', sizeClass)}
        onError={() => setImgBroken(true)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none flex shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        'bg-(--accent-teal-strong)',
        sizeClass
      )}
    >
      {initials || '?'}
    </span>
  )
}
