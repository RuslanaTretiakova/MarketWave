import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { isAuthPasswordCompletionPath, isAuthPublicPath } from '@/lib/auth/auth-paths'
import { isAppProtectedPath } from '@/lib/app-protected-paths'
import { safeReturnPath } from '@/lib/auth-redirect'
import { tryGetPublicSupabaseEnv } from '@/lib/supabase/public-env'

/** Matches @supabase/ssr default session cookie names (`sb-<ref>-auth-token`, chunked `.n`, `-code-verifier`). */
function supabaseAuthCookieNames(request: NextRequest): string[] {
  return request.cookies
    .getAll()
    .map(({ name }) => name)
    .filter((name) => name.startsWith('sb-') && name.includes('-auth-token'))
}

function clearStaleSessionCookies(request: NextRequest, response: NextResponse) {
  const secure = request.nextUrl.protocol === 'https:'
  const expires = supabaseAuthCookieNames(request)
  for (const name of expires) {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      httpOnly: false,
      ...(secure ? { secure: true } : {}),
    })
  }
}

function isRefreshTokenMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false
  }
  const rec = err as { code?: unknown; message?: unknown }
  return (
    rec.code === 'refresh_token_not_found' ||
    (typeof rec.message === 'string' && rec.message.includes('Refresh Token Not Found'))
  )
}

/** Stale or cross-project cookies: strip them and recover without sending app users to a generic `/404`. */
function refreshTokenMissingRecovery(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isAppProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('error', 'session')
    const redirect = NextResponse.redirect(url)
    clearStaleSessionCookies(request, redirect)
    return redirect
  }
  const next = NextResponse.next({ request })
  clearStaleSessionCookies(request, next)
  return next
}

function failureResponse(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isAppProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/404'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next({ request })
}

async function refreshSession(request: NextRequest, supabaseUrl: string, supabaseAnonKey: string) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (pathname === '/auth/sign-up') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  let requirePasswordChange = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('require_password_change')
      .eq('id', user.id)
      .maybeSingle()
    requirePasswordChange = profile?.require_password_change ?? false
  }

  if (user && requirePasswordChange) {
    if (!isAuthPasswordCompletionPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/first-login-password'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && !requirePasswordChange && pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = safeReturnPath(request.nextUrl.searchParams.get('next'))
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && !requirePasswordChange && pathname === '/auth/first-login-password') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (
    !user &&
    !isAuthPublicPath(pathname) &&
    (pathname === '/auth/first-login-password' ||
      pathname.startsWith('/auth/first-login-password/') ||
      pathname === '/auth/update-password' ||
      pathname.startsWith('/auth/update-password/'))
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && isAppProtectedPath(pathname)) {
    supabaseResponse.headers.set(
      'Cache-Control',
      'private, no-store, no-cache, must-revalidate, max-age=0'
    )
  }

  return supabaseResponse
}

export async function updateSession(request: NextRequest) {
  const env = tryGetPublicSupabaseEnv()
  if (!env) {
    console.error(
      '[supabase/middleware] Missing or invalid Supabase URL / anon key (NEXT_PUBLIC_* or SUPABASE_URL / SUPABASE_KEY).'
    )
    return failureResponse(request)
  }
  const { supabaseUrl, supabaseAnonKey } = env

  try {
    return await refreshSession(request, supabaseUrl, supabaseAnonKey)
  } catch (err) {
    console.error('[supabase/middleware] Session refresh failed:', err)
    if (isRefreshTokenMissingError(err)) {
      return refreshTokenMissingRecovery(request)
    }
    return failureResponse(request)
  }
}
