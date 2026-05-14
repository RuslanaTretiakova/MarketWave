'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_RESET_PARAMS = ['page']

export function useSearchParamInput({
  name,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  resetParams = DEFAULT_RESET_PARAMS,
}: {
  name: string
  debounceMs?: number
  resetParams?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlValue = searchParams.get(name) ?? ''

  const [value, setValueState] = useState(urlValue)
  const lastAppliedRef = useRef(urlValue)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (urlValue !== lastAppliedRef.current) {
      lastAppliedRef.current = urlValue
      setValueState(urlValue)
    }
  }, [urlValue])

  const navigate = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = next.trim()
      if (trimmed) params.set(name, trimmed)
      else params.delete(name)
      for (const p of resetParams) params.delete(p)
      lastAppliedRef.current = trimmed
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, name, resetParams]
  )

  const cancelPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => cancelPending, [cancelPending])

  const setValue = useCallback(
    (next: string) => {
      setValueState(next)
      cancelPending()
      const trimmed = next.trim()
      if (trimmed === lastAppliedRef.current) return
      if (trimmed === '') {
        navigate(next)
        return
      }
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        navigate(next)
      }, debounceMs)
    },
    [cancelPending, navigate, debounceMs]
  )

  const submit = useCallback(() => {
    cancelPending()
    navigate(value)
  }, [cancelPending, navigate, value])

  const clear = useCallback(() => {
    setValueState('')
    cancelPending()
    navigate('')
  }, [cancelPending, navigate])

  return { value, setValue, submit, clear }
}
