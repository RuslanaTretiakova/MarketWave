'use client'

import { Suspense, useEffect } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'

import { safePostAuthRedirect } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackBody() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const token_hash = searchParams.get('token_hash')
  const typeRaw = searchParams.get('type')
  const errorParam = searchParams.get('error') ?? searchParams.get('error_description')

  useEffect(() => {
    let cancelled = false

    async function finish() {
      if (errorParam) {
        router.replace(`/auth/login?error=auth`)
        return
      }

      const supabase = createClient()
      const nextPath = safePostAuthRedirect(nextParam)

      const type = typeRaw as EmailOtpType | null
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (error) {
          router.replace(`/auth/login?error=auth`)
          return
        }
        router.replace(nextPath)
        return
      }

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash })
        if (cancelled) return
        if (error) {
          router.replace(`/auth/login?error=auth`)
          return
        }
        router.replace(nextPath)
        return
      }

      const rawHash =
        typeof window !== 'undefined' && window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : ''
      const hp = new URLSearchParams(rawHash)
      const access_token = hp.get('access_token')
      const refresh_token = hp.get('refresh_token')
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (cancelled) return
        if (error) {
          router.replace(`/auth/login?error=auth`)
          return
        }
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`
        )
        router.replace(nextPath)
        return
      }

      router.replace(`/auth/login?error=auth`)
    }

    void finish()
    return () => {
      cancelled = true
    }
  }, [router, code, nextParam, token_hash, typeRaw, errorParam])

  return (
    <p className="text-muted-foreground text-center text-sm leading-relaxed">Completing sign-in…</p>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground text-center text-sm leading-relaxed">Loading…</p>
      }
    >
      <AuthCallbackBody />
    </Suspense>
  )
}
