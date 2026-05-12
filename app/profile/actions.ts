'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ProfileActionResult =
  | { ok: true; avatarUrl?: string | null }
  | { ok: false; message: string }

/** Bucket name from migration 039. */
const AVATAR_BUCKET = 'avatars'

/** 5 MB — avatars don't need to be huge, and we don't want to host
 *  multi-megabyte images on every page that renders a directory. */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

/** Allowed MIME types. SVG is excluded for XSS hygiene. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_NAME_LEN = 200
const MAX_TITLE_LEN = 200
const MAX_BIO_LEN = 4_000
// Lengths for the Community of Practice profile fields. URLs are
// generously sized to fit long LinkedIn slugs without rejecting
// legitimate inputs; the textarea fields stay short so the
// directory cards don't wrap into walls of text.
const MAX_URL_LEN = 500
const MAX_LOOKING_FOR_LEN = 500
const MAX_WILLING_HELP_LEN = 500
const MAX_COMMUNITY_ROLE_LEN = 80

/** http(s) URL allowlist, mirrored on the client. */
function looksLikeUrl(value: string): boolean {
  if (!value) return true
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

/**
 * Update the signed-in user's profile. Accepts a FormData payload
 * because we want to send a file alongside text fields without
 * juggling base64.
 *
 * Fields:
 *  - fullName  (required, trimmed, <= 200 chars)
 *  - title     (optional, <= 200 chars)
 *  - bio       (optional, <= 4000 chars)
 *  - avatar    (optional File - replaces the current photo)
 *  - removeAvatar = "1"  (clears avatar_url; mutually exclusive with avatar)
 *
 * Storage layout: avatars/{userId}/{timestamp}.{ext}. The RLS
 * policy from migration 039 enforces that the first folder segment
 * matches the caller's auth.uid(), so even a malicious payload that
 * tries to write to another user's folder is rejected at the DB.
 */
export async function updateProfile(
  formData: FormData,
): Promise<ProfileActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, message: 'You must be signed in.' }
  }

  const fullName = String(formData.get('fullName') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const removeAvatar = formData.get('removeAvatar') === '1'
  const avatar = formData.get('avatar')

  // Community of Practice profile fields. Each is independently
  // optional; an empty string is the sentinel for "clear this".
  const linkedinUrl = String(formData.get('linkedinUrl') ?? '').trim()
  const twitterUrl = String(formData.get('twitterUrl') ?? '').trim()
  const websiteUrl = String(formData.get('websiteUrl') ?? '').trim()
  const lookingFor = String(formData.get('lookingFor') ?? '').trim()
  const willingToHelp = String(formData.get('willingToHelp') ?? '').trim()
  const yearsRaw = String(formData.get('yearsInEducation') ?? '').trim()
  const communityRole = String(formData.get('communityRole') ?? '').trim()

  if (fullName.length === 0) {
    return { ok: false, message: 'Please enter your name.' }
  }
  if (fullName.length > MAX_NAME_LEN) {
    return { ok: false, message: 'Name is too long.' }
  }
  if (title.length > MAX_TITLE_LEN) {
    return { ok: false, message: 'Title is too long.' }
  }
  if (bio.length > MAX_BIO_LEN) {
    return { ok: false, message: 'Bio is too long.' }
  }

  // Re-validate URLs server-side. We accept blank, http, or https.
  for (const [label, value] of [
    ['LinkedIn URL', linkedinUrl],
    ['Twitter / X URL', twitterUrl],
    ['Website URL', websiteUrl],
  ] as const) {
    if (value.length > MAX_URL_LEN) {
      return { ok: false, message: `${label} is too long.` }
    }
    if (!looksLikeUrl(value)) {
      return {
        ok: false,
        message: `${label} must start with http:// or https://`,
      }
    }
  }
  if (lookingFor.length > MAX_LOOKING_FOR_LEN) {
    return { ok: false, message: '“Looking for” text is too long.' }
  }
  if (willingToHelp.length > MAX_WILLING_HELP_LEN) {
    return { ok: false, message: '“Willing to help” text is too long.' }
  }
  if (communityRole.length > MAX_COMMUNITY_ROLE_LEN) {
    return { ok: false, message: 'Community role is too long.' }
  }

  // Years: blank means clear; otherwise must be 0-80 integer.
  let yearsInEducation: number | null = null
  if (yearsRaw.length > 0) {
    const parsed = Number(yearsRaw)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 80) {
      return {
        ok: false,
        message: 'Years in education must be a whole number between 0 and 80.',
      }
    }
    yearsInEducation = parsed
  }

  // Pull the current avatar URL once so we can clean up the old
  // file on a successful replace/remove. Failure to clean up is
  // logged-and-ignored so the user-facing flow is never blocked by
  // stale storage cruft.
  const { data: existing } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle<{ avatar_url: string | null }>()
  const previousUrl = existing?.avatar_url ?? null

  let nextAvatarUrl: string | null | undefined = undefined // undefined = leave unchanged

  if (removeAvatar) {
    nextAvatarUrl = null
  } else if (avatar instanceof File && avatar.size > 0) {
    if (!ALLOWED_MIME.has(avatar.type)) {
      return {
        ok: false,
        message: 'Photo must be a JPEG, PNG, WEBP, or GIF.',
      }
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      return {
        ok: false,
        message: 'Photo must be 5 MB or smaller.',
      }
    }

    const ext = extensionFor(avatar.type)
    // Timestamped key prevents browser/CDN caches from serving the
    // previous photo after an update.
    const key = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(key, avatar, {
        contentType: avatar.type,
        upsert: false,
      })
    if (uploadErr) {
      return {
        ok: false,
        message: `Could not upload photo: ${uploadErr.message}`,
      }
    }

    const { data: pub } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(key)
    nextAvatarUrl = pub.publicUrl
  }

  // Build the patch lazily so we never overwrite a column we didn't
  // intend to touch. avatar_url is only included when undefined !==
  // typeof nextAvatarUrl.
  const patch: Record<string, string | number | null> = {
    full_name: fullName,
    title: title.length > 0 ? title : null,
    bio: bio.length > 0 ? bio : null,
    // Community of Practice fields. Empty strings are normalised
    // to NULL so a cleared input becomes a real null in the DB
    // (rather than a "" that breaks isEmpty checks).
    linkedin_url: linkedinUrl.length > 0 ? linkedinUrl : null,
    twitter_url: twitterUrl.length > 0 ? twitterUrl : null,
    website_url: websiteUrl.length > 0 ? websiteUrl : null,
    looking_for: lookingFor.length > 0 ? lookingFor : null,
    willing_to_help: willingToHelp.length > 0 ? willingToHelp : null,
    community_role: communityRole.length > 0 ? communityRole : null,
    years_in_education: yearsInEducation,
  }
  if (nextAvatarUrl !== undefined) patch.avatar_url = nextAvatarUrl

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
  if (updateErr) {
    return { ok: false, message: updateErr.message }
  }

  // Best-effort: drop the old avatar from storage. We extract the
  // path from the public URL so we don't accidentally delete files
  // outside the user's folder. Failures here are non-fatal.
  if (
    previousUrl &&
    nextAvatarUrl !== undefined &&
    previousUrl !== nextAvatarUrl
  ) {
    const marker = `/${AVATAR_BUCKET}/`
    const idx = previousUrl.indexOf(marker)
    if (idx >= 0) {
      const path = previousUrl.slice(idx + marker.length)
      // Only delete inside the caller's own folder - paranoia layer
      // on top of the RLS policy.
      if (path.startsWith(`${user.id}/`)) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path])
      }
    }
  }

  // Refresh anywhere the avatar / display name appears.
  revalidatePath('/profile')
  revalidatePath('/team')
  revalidatePath('/community')
  revalidatePath('/dashboard')

  return { ok: true, avatarUrl: nextAvatarUrl ?? previousUrl ?? null }
}
