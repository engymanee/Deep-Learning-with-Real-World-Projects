'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addCommentToReflection } from '@/app/(curriculum)/phases/reflection-actions'

interface Comment {
  id: string
  body: string
  author: {
    full_name: string
    avatar_url?: string
  }
  created_at: string
  parentCommentId?: string | null
  replies?: Comment[]
}

interface ReflectionCommentsProps {
  reflectionId: string
  comments: Comment[]
  onCommentAdded?: (comment: Comment) => void
}

export function ReflectionComments({
  reflectionId,
  comments,
  onCommentAdded,
}: ReflectionCommentsProps) {
  const [newCommentText, setNewCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitComment = async () => {
    if (!newCommentText.trim()) return

    setIsSubmitting(true)
    try {
      const result = await addCommentToReflection(reflectionId, newCommentText)
      if (result.ok) {
        setNewCommentText('')
        // In a real app, you'd refetch comments here
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return

    setIsSubmitting(true)
    try {
      const result = await addCommentToReflection(
        reflectionId,
        replyText,
        parentCommentId,
      )
      if (result.ok) {
        setReplyText('')
        setReplyingTo(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* New comment form */}
      <div className="space-y-3 border-b border-border pb-6">
        <p className="text-sm font-medium">Add a comment</p>
        <Textarea
          placeholder="Share your thoughts on this reflection..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewCommentText('')}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!newCommentText.trim() || isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={(commentId) => setReplyingTo(commentId)}
              isReplying={replyingTo === comment.id}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onSubmitReply={handleSubmitReply}
              isSubmitting={isSubmitting}
            />
          ))
        )}
      </div>
    </div>
  )
}

function CommentThread({
  comment,
  onReply,
  isReplying,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  isSubmitting,
}: {
  comment: Comment
  onReply: (commentId: string) => void
  isReplying: boolean
  replyText: string
  onReplyTextChange: (text: string) => void
  onSubmitReply: (commentId: string) => Promise<void>
  isSubmitting: boolean
}) {
  const [showReplies, setShowReplies] = useState(true)

  return (
    <div className="space-y-3">
      {/* Comment */}
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-start gap-3">
          {comment.author.avatar_url && (
            <img
              src={comment.author.avatar_url}
              alt={comment.author.full_name}
              className="h-8 w-8 rounded-full"
            />
          )}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{comment.author.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <p className="text-sm text-foreground">{comment.body}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-xs"
            >
              Reply
            </Button>
          </div>
        </div>

        {/* Reply form */}
        {isReplying && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onReply('')
                  onReplyTextChange('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment.id)}
                disabled={!replyText.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Reply'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 space-y-3 border-l border-border pl-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isReplying={isReplying}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  )
}
