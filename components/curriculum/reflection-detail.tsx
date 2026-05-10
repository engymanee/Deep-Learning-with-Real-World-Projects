'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReflectionReactions } from './reflection-reactions'
import { ReflectionComments } from './reflection-comments'

interface ReflectionDetailProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reflection: {
    id: string
    body: string
    contentTitle: string
    author: {
      full_name: string
      avatar_url?: string
    }
    created_at: string
  }
  reactions?: {
    like: number
    love: number
    inspire: number
    helpful: number
  }
  userReactions?: string[]
  comments?: any[]
  commentCount?: number
}

/**
 * Full-screen reflection detail modal showing the complete reflection,
 * reactions, and comments. Enables rich community engagement.
 */
export function ReflectionDetail({
  isOpen,
  onOpenChange,
  reflection,
  reactions,
  userReactions,
  comments,
  commentCount = 0,
}: ReflectionDetailProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reflection.contentTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Author info */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            {reflection.author.avatar_url && (
              <img
                src={reflection.author.avatar_url}
                alt={reflection.author.full_name}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{reflection.author.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(reflection.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {/* Reflection content */}
          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {reflection.body}
            </p>
          </div>

          {/* Reactions */}
          <div className="py-3 border-y border-border">
            <ReflectionReactions
              reflectionId={reflection.id}
              reactions={reactions}
              userReactions={userReactions}
              commentCount={commentCount}
            />
          </div>

          {/* Comments */}
          {comments && <ReflectionComments reflectionId={reflection.id} comments={comments} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
