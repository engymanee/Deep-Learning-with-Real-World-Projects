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
  const patch: Record<string, string | null> = {
    full_name: fullName,
    title: title.length > 0 ? title : null,
    bio: bio.length > 0 ? bio : null,
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
