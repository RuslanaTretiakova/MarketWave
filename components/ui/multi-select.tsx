'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formControlInputClassName } from '@/components/ui/form-control'

export type MultiSelectOption = {
  value: string
  label: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className,
}: {
  options: MultiSelectOption[]
  value: string[]
  onChange: (val: string[]) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code))
    } else {
      onChange([...value, code])
    }
  }

  function remove(code: string, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(value.filter((v) => v !== code))
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          formControlInputClassName,
          'flex h-auto min-h-10 cursor-pointer flex-wrap items-center gap-1.5 py-1.5 text-left'
        )}
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground flex-1 leading-none">{placeholder}</span>
        ) : (
          value.map((code) => {
            const opt = options.find((o) => o.value === code)
            return (
              <span
                key={code}
                className="bg-muted text-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {opt?.label ?? code}
                <XIcon
                  className="text-muted-foreground hover:text-foreground size-3 cursor-pointer"
                  onClick={(e) => remove(code, e)}
                />
              </span>
            )
          })
        )}
        <ChevronDownIcon
          className={cn(
            'text-muted-foreground ml-auto size-4 shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="bg-popover border-border shadow-soft absolute z-50 mt-1 w-full rounded-2xl border py-1">
          <div className="border-border/50 border-b px-3 pt-2 pb-1.5">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground px-3 py-2 text-sm">No results</li>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt.value)
                return (
                  <li key={opt.value}>
                    <label className="hover:bg-accent flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt.value)}
                        className="accent-foreground size-3.5 rounded"
                      />
                      <span className="text-muted-foreground w-8 shrink-0 font-mono text-xs">
                        {opt.value}
                      </span>
                      {opt.label}
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
