import { createClient } from '@/lib/supabase/client'

/** Client-only: ends Supabase session and assigns `location` to clear client state reliably. */
export async function signOutAndRedirect(path: string) {
  const supabase = createClient()
  try {
    await supabase.auth.signOut()
  } finally {
    window.location.assign(path)
  }
}

/** App shell: after sign-out, require a fresh login. */
export async function signOutAndRedirectToLogin() {
  return signOutAndRedirect('/auth/login')
}
