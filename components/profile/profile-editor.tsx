'use client'

import { useRef, useState, useTransition } from 'react'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { initialsFor } from '@/lib/types/profile'
import { updateProfile } from '@/app/profile/actions'

interface Props {
  /** Server-rendered initial values; the form re-syncs on save. */
  initial: {
    id: string
    email: string | null
    fullName: string
    title: string | null
    bio: string | null
    avatarUrl: string | null
  }
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

/**
 * Single-page profile editor. Layout:
 *  - Left: large avatar + Upload / Remove controls.
 *  - Right: name, title, bio inputs, Save button.
 *
 * The avatar is kept in local state as a preview the moment the
 * user picks a file - we only POST when they hit Save, and the form
 * round-trips through {@link updateProfile} which also persists the
 * text fields. Side effect: every successful save revalidates the
 * Team and Community pages so the new photo shows up everywhere.
 */
export function ProfileEditor({ initial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Text state - controlled inputs make validation predictable.
  const [fullName, setFullName] = useState(initial.fullName)
  const [title, setTitle] = useState(initial.title ?? '')
  const [bio, setBio] = useState(initial.bio ?? '')

  // Avatar state. `previewUrl` is what's shown in the <Avatar>; it
  // updates as soon as the user picks a file (object URL) or hits
  // Remove. We keep the original URL separate so Remove has
  // something to revert to if they cancel the change.
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial.avatarUrl,
  )
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [shouldRemove, setShouldRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME.has(file.type)) {
      setError('Photo must be a JPEG, PNG, WEBP, or GIF.')
      // Clear the input so the user can re-pick the same file later.
      e.target.value = ''
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Photo must be 5 MB or smaller.')
      e.target.value = ''
      return
    }
    setError(null)
    setSuccess(null)
    setShouldRemove(false)
    setPickedFile(file)
    // Object URL gives instant feedback without uploading.
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleRemoveAvatar() {
    setError(null)
    setSuccess(null)
    setPickedFile(null)
    setShouldRemove(true)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedName = fullName.trim()
    if (trimmedName.length === 0) {
      setError('Please enter your name.')
      return
    }

    const fd = new FormData()
    fd.append('fullName', trimmedName)
    fd.append('title', title.trim())
    fd.append('bio', bio.trim())
    if (pickedFile) fd.append('avatar', pickedFile)
    if (shouldRemove) fd.append('removeAvatar', '1')

    startTransition(async () => {
      const res = await updateProfile(fd)
      if (!res.ok) {
        setError(res.message)
        return
      }
      // Reset transient state - the next render reflects whatever
      // the server persisted (mainly the rehosted avatar URL).
      setPickedFile(null)
      setShouldRemove(false)
      if (typeof res.avatarUrl !== 'undefined') {
        setPreviewUrl(res.avatarUrl)
      }
      setSuccess('Profile saved.')
      router.refresh()
    })
  }

  const initials = initialsFor(fullName, initial.email)

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 lg:flex-row lg:gap-10"
    >
      {/* Avatar column */}
      <div className="flex flex-col items-center gap-4 lg:w-64">
        <div className="relative">
          <Avatar className="h-32 w-32 ring-1 ring-border">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-3xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Upload new photo"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handlePickFile}
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {previewUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAvatar}
              className="gap-1.5 text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          JPEG, PNG, WEBP, or GIF. Up to 5 MB.
        </p>
      </div>

      {/* Fields column */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            value={initial.email ?? ''}
            disabled
            className="bg-muted text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            Contact an admin to change your sign-in email.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Full name</Label>
          <Input
            id="profile-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Jordan Patel"
            required
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-title">Title</Label>
          <Input
            id="profile-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Principal at Washington Latin"
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-bio">Bio</Label>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share a little about yourself - your school, what you're working on, what brought you to the Fellowship."
            rows={6}
            maxLength={4000}
          />
          <p className="text-right text-xs text-muted-foreground">
            {bio.length} / 4000
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          >
            {success}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {pending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
