import { notFound } from 'next/navigation'

import { ProfileView } from '@/components/settings/profile-view'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Profile',
}

export default async function SettingsProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Select `*` so the page still loads if optional columns (e.g. `bio`, `email` mirror) are not migrated yet.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileErr || !profile) {
    notFound()
  }

  return (
    <ProfileView
      authEmail={user.email ?? ''}
      profile={{
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio ?? null,
        email: profile.email ?? null,
        company_name: profile.company_name,
        phone: profile.phone,
        role: profile.role,
        created_at: profile.created_at,
      }}
    />
  )
}
