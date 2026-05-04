/** Lets shell chrome (header avatar) update immediately after profile save without waiting for RSC. */
export const MW_PROFILE_AVATAR_UPDATED_EVENT = 'mw-profile-avatar-updated'

export type MwProfileAvatarUpdatedDetail = {
  avatarUrl: string | null
}

export function dispatchProfileAvatarUpdated(detail: MwProfileAvatarUpdatedDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<MwProfileAvatarUpdatedDetail>(MW_PROFILE_AVATAR_UPDATED_EVENT, { detail })
  )
}
