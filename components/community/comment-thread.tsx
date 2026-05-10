'use client'

import { useMemo, useState, useTransition } from 'react'
import { Pencil, Reply, Trash2, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { initialsFor } from '@/lib/types/profile'
import {
  addComment,
  deleteComment,
  updateComment,
} from '@/app/community/reflections/actions'
import type { CommentItem } from '@/lib/community/load-reflections'

interface Props {
  /** The post or reflection these comments belong to. */
  subjectType: 'post' | 'reflection'
  subjectId: string
  /** Initial server-rendered comments. We never re-fetch; instead we
   *  optimistically reconcile using the action results. */
  comments: CommentItem[]
  /** Current viewer; null when anonymous (shouldn't happen on
   *  authenticated pages but kept for safety). */
  currentUser: {
    id: string
    fullName: string | null
    email: string | null
    avatarUrl: string | null
    isAdmin: boolean
  } | null
}

/**
 * Inline comment thread. Supports:
 *   - Composing a new top-level comment
 *   - Replying to an existing comment (one level)
 *   - Editing your own comment
 *   - Soft-deleting your own comment (admins can delete any)
 *
 * Comments stream optimistically: on success we patch local state so
 * the UI reflects the change without a full route refresh, then a
 * server-side `revalidatePath` keeps the SSR cache in sync for the
 * next visit.
 */
export function CommentThread({
  subjectType,
  subjectId,
  comments: initialComments,
  currentUser,
}: Props) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Top-level composer state.
  const [body, setBody] = useState('')

  // Reply / edit modes; null when no row is being acted on.
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')

  // Group by parent so we render top-level → replies in DOM order.
  const tree = useMemo(() => buildTree(comments), [comments])

  function clearComposer() {
    setBody('')
    setReplyingTo(null)
    setReplyBody('')
    setEditingId(null)
    setEditBody('')
    setError(null)
  }

  function submitTopLevel() {
    if (!currentUser) return
    const trimmed = body.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const result = await addComment({
        subjectType,
        subjectId,
        body: trimmed,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      // Optimistic insert with the freshly-returned id so a follow-up
      // edit/delete points at the real row.
      setComments((prev) => [
        ...prev,
        {
          id: result.commentId,
          body: trimmed,
          created_at: new Date().toISOString(),
          updated_at: null,
          parent_comment_id: null,
          is_deleted: false,
          author: {
            id: currentUser.id,
            full_name: currentUser.fullName,
            email: currentUser.email,
            avatar_url: currentUser.avatarUrl,
          },
        },
      ])
      setBody('')
    })
  }

  function submitReply(parentId: string) {
    if (!currentUser) return
    const trimmed = replyBody.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const result = await addComment({
        subjectType,
        subjectId,
        body: trimmed,
        parentCommentId: parentId,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setComments((prev) => [
        ...prev,
        {
          id: result.commentId,
          body: trimmed,
          created_at: new Date().toISOString(),
          updated_at: null,
          parent_comment_id: parentId,
          is_deleted: false,
          author: {
            id: currentUser.id,
            full_name: currentUser.fullName,
            email: currentUser.email,
            avatar_url: currentUser.avatarUrl,
          },
        },
      ])
      setReplyingTo(null)
      setReplyBody('')
    })
  }

  function submitEdit(commentId: string) {
    const trimmed = editBody.trim()
    if (!trimmed) return
    setError(null)
    startTransition(async () => {
      const result = await updateComment({ commentId, body: trimmed })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                body: trimmed,
                updated_at: new Date().toISOString(),
              }
            : c,
        ),
      )
      setEditingId(null)
      setEditBody('')
    })
  }

  function submitDelete(commentId: string) {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Delete this comment? It will be marked as removed.')
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteComment({ commentId })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, body: '', is_deleted: true } : c,
        ),
      )
    })
  }

  return (
    <section className="flex flex-col gap-3" aria-label="Comments">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {comments.filter((c) => !c.is_deleted).length === 0
          ? 'Comments'
          : `Comments (${comments.filter((c) => !c.is_deleted).length})`}
      </h3>

      {tree.length > 0 && (
        <ul className="flex flex-col gap-3">
          {tree.map((node) => (
            <li key={node.comment.id} className="flex flex-col gap-2">
              <CommentRow
                comment={node.comment}
                currentUser={currentUser}
                isEditing={editingId === node.comment.id}
                editBody={editBody}
                pending={pending}
                onReplyClick={() => {
                  clearComposer()
                  setReplyingTo(node.comment.id)
                }}
                onEditClick={() => {
                  clearComposer()
                  setEditingId(node.comment.id)
                  setEditBody(node.comment.body)
                }}
                onDeleteClick={() => submitDelete(node.comment.id)}
                onEditChange={setEditBody}
                onEditSubmit={() => submitEdit(node.comment.id)}
                onEditCancel={() => {
                  setEditingId(null)
                  setEditBody('')
                }}
              />

              {node.replies.length > 0 && (
                <ul className="ml-10 flex flex-col gap-3 border-l border-border pl-4">
                  {node.replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentRow
                        comment={reply}
                        currentUser={currentUser}
                        isEditing={editingId === reply.id}
                        editBody={editBody}
                        pending={pending}
                        onEditClick={() => {
                          clearComposer()
                          setEditingId(reply.id)
                          setEditBody(reply.body)
                        }}
                        onDeleteClick={() => submitDelete(reply.id)}
                        onEditChange={setEditBody}
                        onEditSubmit={() => submitEdit(reply.id)}
                        onEditCancel={() => {
                          setEditingId(null)
                          setEditBody('')
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {/* Reply composer, scoped under this comment. */}
              {replyingTo === node.comment.id && (
                <div className="ml-10 flex flex-col gap-2 border-l border-border pl-4">
                  <Textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={3}
                    placeholder={`Reply to ${
                      node.comment.author?.full_name?.trim() ||
                      node.comment.author?.email ||
                      'this comment'
                    }…`}
                    maxLength={4000}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => submitReply(node.comment.id)}
                      disabled={pending || replyBody.trim().length === 0}
                    >
                      Post reply
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyBody('')
                      }}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Top-level composer */}
      {currentUser ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            maxLength={4000}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {body.length} / 4000
            </p>
            <Button
              type="button"
              size="sm"
              onClick={submitTopLevel}
              disabled={pending || body.trim().length === 0}
            >
              Post comment
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sign in to leave a comment.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */

interface TreeNode {
  comment: CommentItem
  replies: CommentItem[]
}

/**
 * Build a top-level → replies tree. Replies that point to a missing
 * parent (e.g. parent was hard-deleted) are surfaced as top-level so
 * they don't disappear silently.
 */
function buildTree(comments: CommentItem[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  const tops: TreeNode[] = []

  // Seed top-level entries first so replies always find their parent.
  for (const c of comments) {
    if (!c.parent_comment_id) {
      const node: TreeNode = { comment: c, replies: [] }
      byId.set(c.id, node)
      tops.push(node)
    }
  }
  for (const c of comments) {
    if (c.parent_comment_id) {
      const parent = byId.get(c.parent_comment_id)
      if (parent) parent.replies.push(c)
      else {
        // Orphan reply - render as top level.
        const node: TreeNode = { comment: c, replies: [] }
        byId.set(c.id, node)
        tops.push(node)
      }
    }
  }
  // Replies stay in chronological order (initial comments arrive
  // ASC by created_at from the loader).
  return tops
}

interface CommentRowProps {
  comment: CommentItem
  currentUser: Props['currentUser']
  isEditing: boolean
  editBody: string
  pending: boolean
  onReplyClick?: () => void
  onEditClick: () => void
  onDeleteClick: () => void
  onEditChange: (v: string) => void
  onEditSubmit: () => void
  onEditCancel: () => void
}

function CommentRow({
  comment,
  currentUser,
  isEditing,
  editBody,
  pending,
  onReplyClick,
  onEditClick,
  onDeleteClick,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: CommentRowProps) {
  const authorName =
    comment.author?.full_name?.trim() ||
    comment.author?.email ||
    'Anonymous'
  const initials = initialsFor(comment.author?.full_name, comment.author?.email)
  const isOwner =
    !!currentUser && !!comment.author && comment.author.id === currentUser.id
  const canDelete =
    !comment.is_deleted &&
    !!currentUser &&
    (isOwner || currentUser.isAdmin)

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 shrink-0">
        {comment.author?.avatar_url ? (
          <AvatarImage src={comment.author.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="text-[10px] font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="truncate font-medium text-foreground">
            {authorName}
          </span>
          <span className="text-muted-foreground">
            {formatRelative(comment.created_at)}
            {comment.updated_at && !comment.is_deleted && ' · edited'}
          </span>
        </div>

        {comment.is_deleted ? (
          <p className="mt-1 text-sm italic text-muted-foreground">
            This comment was removed.
          </p>
        ) : isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <Textarea
              value={editBody}
              onChange={(e) => onEditChange(e.target.value)}
              rows={3}
              maxLength={4000}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onEditSubmit}
                disabled={pending || editBody.trim().length === 0}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onEditCancel}
                disabled={pending}
              >
                <X className="mr-1 h-3 w-3" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {comment.body}
          </p>
        )}

        {!comment.is_deleted && !isEditing && currentUser && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            {onReplyClick && (
              <button
                type="button"
                onClick={onReplyClick}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Reply className="h-3 w-3" aria-hidden="true" />
                Reply
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={onEditClick}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDeleteClick}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Compact "5m / 3h / Aug 14" relative date used in the comment row. */
function formatRelative(iso: string): string {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
