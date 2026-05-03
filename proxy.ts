import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy-session'

/** Single handler — default export fixes Node middleware interop (`default || module` must be a function). */
async function proxy(request: NextRequest) {
  return updateSession(request)
}

export default proxy
export { proxy }

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * Required for Supabase session refresh on every navigation.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
