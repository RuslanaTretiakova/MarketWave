'use client'

import { Search } from 'lucide-react'

import { FilterInput } from '@/components/ui/filter-bar'
import { useSearchParamInput } from '@/hooks/use-search-param-input'
import { cn } from '@/lib/utils'

export function SearchField({
  name,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
  debounceMs,
  resetParams,
  withIcon = true,
}: {
  name: string
  placeholder?: string
  ariaLabel?: string
  className?: string
  inputClassName?: string
  debounceMs?: number
  resetParams?: string[]
  withIcon?: boolean
}) {
  const { value, setValue, submit } = useSearchParamInput({ name, debounceMs, resetParams })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className={cn('relative min-w-0 flex-1 sm:max-w-xs sm:min-w-48 sm:flex-none', className)}
    >
      {withIcon ? (
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
      ) : null}
      <FilterInput
        name={name}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(withIcon ? 'pr-3 pl-10' : 'px-3', inputClassName)}
        autoComplete="off"
      />
    </form>
  )
}
