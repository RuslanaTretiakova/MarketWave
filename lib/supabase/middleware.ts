import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { isAppProtectedPath } from '@/lib/app-protected-paths'
import { safeReturnPath } from '@/lib/auth-redirect'

function failureResponse(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isAppProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
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

  // Refresh session — do not remove, required for server-side auth to work
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (pathname === '/auth/sign-up') {
    const { data, error } = await supabase.rpc('bootstrap_signup_allowed')
    if (!error && data === false) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = safeReturnPath(request.nextUrl.searchParams.get('next'))
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/auth/sign-up') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!user && isAppProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export async function updateSession(request: NextRequest) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrl = rawUrl?.trim()
  const supabaseAnonKey = rawKey?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[supabase/middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both to your deployment environment (e.g. Vercel → Settings → Environment Variables) and redeploy.'
    )
    return failureResponse(request)
  }

  try {
    new URL(supabaseUrl)
  } catch {
    console.error('[supabase/middleware] NEXT_PUBLIC_SUPABASE_URL is not a valid absolute URL.')
    return failureResponse(request)
  }

  try {
    return await refreshSession(request, supabaseUrl, supabaseAnonKey)
  } catch (err) {
    console.error('[supabase/middleware] Session refresh failed:', err)
    return failureResponse(request)
  }
}
