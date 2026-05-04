'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  ACCEPT_AVATAR_ATTR,
  MAX_AVATAR_BYTES,
  normalizeImageFileForUpload,
} from '@/lib/profile/avatar-upload-validate'
import {
  MW_PROFILE_AVATAR_UPDATED_EVENT,
  dispatchProfileAvatarUpdated,
  type MwProfileAvatarUpdatedDetail,
} from '@/lib/profile/profile-avatar-sync'
import { removeOwnAvatar, uploadOwnAvatar } from '@/lib/profile/avatar-own-actions'
import { updateOwnProfile } from '@/lib/profile/update-own-profile'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'
import { createClient } from '@/lib/supabase/client'
import { avatarInitialsFromProfile, splitDisplayName } from '@/lib/user-display-name'
import type { Database } from '@/lib/supabase/types'
import { ChangeCredentialsSheet } from '@/components/settings/change-credentials-sheet'
import { Button } from '@/components/ui/button'
import { FormControlInput, FormControlTextarea } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type ProfileSettingsRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'full_name' | 'avatar_url' | 'bio' | 'email' | 'company_name' | 'phone' | 'role' | 'created_at'
>

const ROLE_LABEL: Record<Database['public']['Enums']['user_role'], string> = {
  admin: 'Admin',
  client: 'Client',
  manager: 'Manager',
  sourcer: 'Sourcer',
  copywriter: 'Copywriter',
}

function normalizeAvatarUrl(url: string | null | undefined): string | null {
  const t = url?.trim()
  return t ? t : null
}

function profileFormKey(p: ProfileSettingsRow): string {
  return [
    p.full_name ?? '',
    p.avatar_url ?? '',
    p.bio ?? '',
    p.email ?? '',
    p.company_name ?? '',
    p.phone ?? '',
    p.role,
    p.created_at,
  ].join('|')
}

function ProfileAvatarCircle({ src, initials }: { src: string; initials: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) {
    return (
      <span
        aria-hidden
        className="flex size-24 shrink-0 items-center justify-center rounded-full bg-(--accent-teal-strong) text-xl font-semibold text-white"
      >
        {initials || '?'}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={96}
      height={96}
      decoding="async"
      className="border-border pointer-events-none size-24 shrink-0 rounded-full border object-cover"
      onError={() => setBroken(true)}
    />
  )
}

function PillPasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  autoComplete: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="gap-inset flex flex-col">
      <Label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <Lock
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <FormControlInput
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pr-11 pl-10"
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 outline-none focus-visible:ring-2"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  )
}

export function ProfileView({
  authEmail,
  profile,
}: {
  authEmail: string
  profile: ProfileSettingsRow
}) {
  return (
    <ProfileSettingsForm key={profileFormKey(profile)} authEmail={authEmail} profile={profile} />
  )
}

function ProfileSettingsForm({
  authEmail,
  profile,
}: {
  authEmail: string
  profile: ProfileSettingsRow
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [credOpen, setCredOpen] = useState(false)

  const [persistedAvatarUrl, setPersistedAvatarUrl] = useState<string | null>(() =>
    normalizeAvatarUrl(profile.avatar_url)
  )

  const profileEmail = profile.email ?? ''
  const emailFallback = profileEmail || authEmail

  const parsedName = splitDisplayName(profile.full_name, emailFallback)
  const [firstName, setFirstName] = useState(parsedName.first)
  const [lastName, setLastName] = useState(parsedName.last)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState<'photo' | 'name' | 'bio' | false>(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setPersistedAvatarUrl(normalizeAvatarUrl(profile.avatar_url))
    })
  }, [profile.avatar_url])

  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const ce = e as CustomEvent<MwProfileAvatarUpdatedDetail>
      if (ce.detail && 'avatarUrl' in ce.detail) {
        setPersistedAvatarUrl(normalizeAvatarUrl(ce.detail.avatarUrl))
      }
    }
    window.addEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
    return () => window.removeEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function syncAvatarFromProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: row } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      setPersistedAvatarUrl(normalizeAvatarUrl(row?.avatar_url ?? null))
    }

    void syncAvatarFromProfile()

    function onVisible() {
      if (document.visibilityState === 'visible') void syncAvatarFromProfile()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname, profile.avatar_url])

  const displayPreview = previewUrl ?? persistedAvatarUrl ?? null

  const initials = avatarInitialsFromProfile(
    [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || profile.full_name,
    emailFallback
  )

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  })

  const nameDirty =
    firstName.trim() !== parsedName.first.trim() || lastName.trim() !== parsedName.last.trim()
  const bioDirty = bio !== (profile.bio ?? '')

  const profileSectionClass =
    'rounded-2xl border border-border/60 bg-background p-section shadow-soft ring-1 ring-border/60'
  const profileActionBtn = 'h-10 min-h-10 rounded-full text-sm'
  const saving = busy !== false
  const avatarPickBusy = saving || Boolean(previewUrl?.startsWith('blob:'))

  async function persistAvatarUpload(file: File) {
    setBusy('photo')
    setProfileSaveError(null)

    try {
      const res = await uploadOwnAvatar(file)
      if (!res.ok) {
        setProfileSaveError(res.message)
        toast.error(res.message)
        setPreviewUrl((prev) => {
          if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
          return null
        })
        return
      }

      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
      setPersistedAvatarUrl(res.publicUrl)
      dispatchProfileAvatarUpdated({ avatarUrl: res.publicUrl })
      toast.success('Profile photo updated')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function persistAvatarRemove() {
    const prevStoredAvatarUrl = persistedAvatarUrl
    if (!prevStoredAvatarUrl || saving || previewUrl?.startsWith('blob:')) return

    setBusy('photo')
    setProfileSaveError(null)

    try {
      const res = await removeOwnAvatar()
      if (!res.ok) {
        setProfileSaveError(res.message)
        toast.error(res.message)
        return
      }

      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
      setPersistedAvatarUrl(null)
      dispatchProfileAvatarUpdated({ avatarUrl: null })
      toast.success('Profile photo removed')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw || avatarPickBusy) return
    const normalized = normalizeImageFileForUpload(raw)
    if (!normalized) {
      setProfileSaveError('Choose an image file (JPEG, PNG, WebP, or GIF).')
      toast.error('Choose an image file (JPEG, PNG, WebP, or GIF).')
      return
    }
    const { file } = normalized
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileSaveError('Image must be 2MB or smaller.')
      toast.error('Image must be 2MB or smaller.')
      return
    }
    setProfileSaveError(null)
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    void persistAvatarUpload(file)
  }

  async function onSubmitName(e: React.FormEvent) {
    e.preventDefault()
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    if (!displayName.trim()) {
      setProfileSaveError('Enter your first or last name.')
      return
    }
    if (!nameDirty || saving) return

    setBusy('name')
    setProfileSaveError(null)
    try {
      const res = await updateOwnProfile({ full_name: displayName.trim() })
      if (!res.ok) {
        setProfileSaveError(res.message)
        return
      }
      toast.success('Display name updated')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitBio(e: React.FormEvent) {
    e.preventDefault()
    if (!bioDirty || saving) return

    setBusy('bio')
    setProfileSaveError(null)
    try {
      const res = await updateOwnProfile({ bio: bio.trim() || null })
      if (!res.ok) {
        setProfileSaveError(res.message)
        return
      }
      toast.success('Bio saved')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)

    if (!pwCurrent) {
      setPwError('Current password is required.')
      return
    }
    if (!pwNew || pwNew.length < AUTH_MIN_PASSWORD_LENGTH) {
      setPwError(`New password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError('New password and confirmation do not match.')
      return
    }

    setPwBusy(true)
    const supabase = createClient()

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: pwCurrent,
    })

    if (signErr) {
      setPwError(mapAuthError(signErr).message)
      setPwBusy(false)
      return
    }

    const { error: updErr } = await supabase.auth.updateUser({ password: pwNew })

    if (updErr) {
      setPwError(mapAuthError(updErr).message)
      setPwBusy(false)
      return
    }

    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPwBusy(false)
    toast.success('Password updated')
    router.refresh()
  }

  return (
    <div className="gap-layout mx-auto flex max-w-2xl flex-col">
      <div>
        <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
          Profile
        </h1>
        <p className="text-muted-foreground mt-inset max-w-xl text-sm leading-relaxed">
          Update your personal information, profile photo, and password — tied to your workspace
          account.
        </p>
      </div>

      <div className="gap-section flex flex-col">
        <section aria-labelledby="profile-photo-heading" className={profileSectionClass}>
          <div className="gap-block flex flex-col">
            <div className="gap-block flex flex-col sm:flex-row sm:items-center">
              <div className="gap-block flex items-center">
                <div className="relative inline-flex shrink-0">
                  <label
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer rounded-full transition-opacity outline-none',
                      'focus-within:ring-ring focus-within:ring-offset-background ring-offset-background focus-within:ring-2 focus-within:ring-offset-2',
                      avatarPickBusy && 'pointer-events-none cursor-not-allowed opacity-50'
                    )}
                    aria-label="Choose profile photo"
                  >
                    {displayPreview ? (
                      <ProfileAvatarCircle
                        key={displayPreview}
                        src={displayPreview}
                        initials={initials}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="flex size-24 shrink-0 items-center justify-center rounded-full bg-(--accent-teal-strong) text-xl font-semibold text-white"
                      >
                        {initials || '?'}
                      </span>
                    )}
                    <input
                      id="profile-avatar-file"
                      type="file"
                      accept={ACCEPT_AVATAR_ATTR}
                      className="sr-only"
                      disabled={avatarPickBusy}
                      onChange={onPickFile}
                    />
                  </label>
                  {persistedAvatarUrl ? (
                    <button
                      type="button"
                      aria-label="Remove profile photo"
                      disabled={avatarPickBusy}
                      className={cn(
                        'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        'absolute -top-1 -right-1 z-10 flex size-7 items-center justify-center rounded-full border shadow-sm',
                        'focus-visible:ring-ring focus-visible:ring-offset-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                        avatarPickBusy && 'pointer-events-none opacity-40'
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void persistAvatarRemove()
                      }}
                    >
                      <X className="size-3.5" aria-hidden strokeWidth={2.5} />
                    </button>
                  ) : null}
                </div>
                <div className="gap-inset ml-block flex min-w-0 flex-col">
                  <h2 id="profile-photo-heading" className="text-foreground text-sm font-semibold">
                    Profile picture
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Click your photo to upload — saved automatically · PNG, JPEG or WebP — max 2 MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="profile-name-heading" className={profileSectionClass}>
          <form onSubmit={onSubmitName} className="flex flex-col gap-0">
            <h2
              id="profile-name-heading"
              className="text-foreground mb-block text-sm font-semibold"
            >
              Full name
            </h2>
            <div className="gap-inset grid sm:grid-cols-2">
              <div className="gap-inset flex min-w-0 flex-col">
                <Label
                  htmlFor="profile-first-name"
                  className="text-muted-foreground text-xs font-medium"
                >
                  First name
                </Label>
                <FormControlInput
                  id="profile-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  disabled={saving}
                />
              </div>
              <div className="gap-inset flex min-w-0 flex-col">
                <Label
                  htmlFor="profile-last-name"
                  className="text-muted-foreground text-xs font-medium"
                >
                  Last name
                </Label>
                <FormControlInput
                  id="profile-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  disabled={saving}
                />
              </div>
            </div>
            <div className="mt-section flex justify-end">
              <Button
                type="submit"
                variant="default"
                className={cn(profileActionBtn)}
                disabled={!nameDirty || saving}
              >
                {busy === 'name' ? 'Updating…' : 'Update name'}
              </Button>
            </div>
          </form>
        </section>

        <section
          aria-labelledby="profile-bio-heading"
          className={cn(profileSectionClass, 'min-w-0')}
        >
          <form onSubmit={onSubmitBio} className="flex flex-col gap-0">
            <h2 id="profile-bio-heading" className="text-foreground text-sm font-semibold">
              Bio
            </h2>
            <FormControlTextarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell teammates a bit about you…"
              className="mt-inset"
              disabled={saving}
            />
            <div className="mt-section flex justify-end">
              <Button
                type="submit"
                variant="default"
                className={cn(profileActionBtn)}
                disabled={!bioDirty || saving}
              >
                {busy === 'bio' ? 'Updating…' : 'Update bio'}
              </Button>
            </div>
          </form>
        </section>

        <section aria-labelledby="profile-email-heading" className={profileSectionClass}>
          <h2 id="profile-email-heading" className="text-foreground text-sm font-semibold">
            Contact email
          </h2>
          <p className="text-muted-foreground mt-inset mb-block max-w-lg text-xs leading-relaxed">
            Your sign-in address and where we reach you for invoices and notifications.
          </p>
          <div className="gap-block flex flex-col sm:flex-row sm:items-end">
            <div className="relative min-w-0 flex-1">
              <Mail
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <FormControlInput
                id="profile-email-readonly"
                type="email"
                readOnly
                value={profileEmail || authEmail}
                className="pl-10"
                aria-readonly="true"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                profileActionBtn,
                'border-cta/35 text-cta hover:bg-cta/10 shrink-0 border-dashed'
              )}
              disabled={saving}
              onClick={() => setCredOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Change email
            </Button>
          </div>
          {!profileEmail ? (
            <p className="text-muted-foreground mt-inset text-xs">
              Showing Auth email until your profile row includes a mirrored email.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="profile-workspace-heading" className={profileSectionClass}>
          <h2 id="profile-workspace-heading" className="text-foreground text-sm font-semibold">
            Workspace
          </h2>
          <div className="mt-block gap-inset grid sm:grid-cols-2">
            <div className="gap-inset flex min-w-0 flex-col">
              <Label
                htmlFor="profile-company"
                className="text-muted-foreground text-xs font-medium"
              >
                Company
              </Label>
              <FormControlInput
                id="profile-company"
                readOnly
                value={profile.company_name ?? ''}
                placeholder="—"
              />
            </div>
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="profile-phone" className="text-muted-foreground text-xs font-medium">
                Phone
              </Label>
              <FormControlInput
                id="profile-phone"
                readOnly
                value={profile.phone ?? ''}
                placeholder="—"
              />
            </div>
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="profile-role" className="text-muted-foreground text-xs font-medium">
                Role
              </Label>
              <FormControlInput id="profile-role" readOnly value={ROLE_LABEL[profile.role]} />
            </div>
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="profile-since" className="text-muted-foreground text-xs font-medium">
                Member since
              </Label>
              <FormControlInput id="profile-since" readOnly value={memberSince} />
            </div>
          </div>
        </section>

        {profileSaveError ? (
          <div
            role="alert"
            className="border-destructive/35 bg-background p-section text-destructive shadow-soft ring-destructive/20 rounded-2xl border text-sm ring-1"
          >
            {profileSaveError}
          </div>
        ) : null}

        <section aria-labelledby="profile-password-heading" className={profileSectionClass}>
          <form onSubmit={onSubmitPassword} className="flex flex-col gap-0">
            <h2 id="profile-password-heading" className="text-foreground text-sm font-semibold">
              Password
            </h2>
            <p className="text-muted-foreground mt-inset mb-block max-w-lg text-xs leading-relaxed">
              Confirm your current password, then set a new one. To change your email (and
              optionally password in one place), use{' '}
              <button
                type="button"
                className="text-cta hover:text-cta inline p-0 font-medium underline-offset-2 hover:underline"
                disabled={saving}
                onClick={() => setCredOpen(true)}
              >
                Change email
              </button>{' '}
              above.
            </p>
            <div className="gap-inset grid sm:grid-cols-2">
              <PillPasswordField
                id="profile-pw-current"
                label="Current password"
                autoComplete="current-password"
                value={pwCurrent}
                onChange={setPwCurrent}
                disabled={pwBusy || saving}
              />
              <PillPasswordField
                id="profile-pw-new"
                label="New password"
                autoComplete="new-password"
                value={pwNew}
                onChange={setPwNew}
                disabled={pwBusy || saving}
              />
            </div>
            <div className="gap-inset mt-inset flex flex-col">
              <PillPasswordField
                id="profile-pw-confirm"
                label="Confirm new password"
                autoComplete="new-password"
                value={pwConfirm}
                onChange={setPwConfirm}
                disabled={pwBusy || saving}
              />
            </div>
            {pwError ? (
              <p className="text-destructive mt-block text-sm" role="alert">
                {pwError}
              </p>
            ) : null}
            <div className="mt-section flex justify-end">
              <Button
                type="submit"
                variant="outline"
                className={cn(profileActionBtn)}
                disabled={pwBusy || saving}
              >
                {pwBusy ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ChangeCredentialsSheet open={credOpen} onOpenChange={setCredOpen} sessionEmail={authEmail} />
    </div>
  )
}
