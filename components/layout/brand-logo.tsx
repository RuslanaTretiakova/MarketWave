'use client'

import { Waves } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const ICON_PX = 40
const ICON_TILE_PX = 22

type BrandLogoMarkProps = {
  className?: string
  /** Teal tile + white waves (marketing header style). */
  tile?: boolean
}

/** Logo mark — waves only, or compact tile for dense chrome. */
export function BrandLogoMark({ className, tile = false }: BrandLogoMarkProps) {
  if (tile) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[10px] bg-(--marketing-teal-deep) p-2 shadow-sm',
          className
        )}
        aria-hidden
      >
        <Waves size={ICON_TILE_PX} weight="fill" className="text-white" />
      </span>
    )
  }

  return (
    <span
      className={cn('p-inset inline-flex shrink-0 items-center justify-center', className)}
      aria-hidden
    >
      <Waves size={ICON_PX} weight="fill" className="text-primary" />
    </span>
  )
}
