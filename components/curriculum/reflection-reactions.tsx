'use client'

import { useState } from 'react'
import { Heart, Lightbulb, ThumbsUp, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { addReactionToReflection } from '@/app/(curriculum)/phases/reflection-actions'

interface ReflectionReactionsProps {
  reflectionId: string
  reactions?: {
    like: number
    love: number
    inspire: number
    helpful: number
  }
  userReactions?: string[]
  onCommentClick?: () => void
  commentCount?: number
}

const reactionTypes = [
  { type: 'like', icon: ThumbsUp, label: 'Like', emoji: '👍' },
  { type: 'love', icon: Heart, label: 'Love', emoji: '❤️' },
  { type: 'inspire', icon: Lightbulb, label: 'Inspire', emoji: '💡' },
  { type: 'helpful', icon: Heart, label: 'Helpful', emoji: '✨' },
]

export function ReflectionReactions({
  reflectionId,
  reactions = { like: 0, love: 0, inspire: 0, helpful: 0 },
  userReactions = [],
  onCommentClick,
  commentCount = 0,
}: ReflectionReactionsProps) {
  const [localReactions, setLocalReactions] = useState(reactions)
  const [localUserReactions, setLocalUserReactions] = useState(userReactions)
  const [isLoading, setIsLoading] = useState(false)

  const handleReaction = async (reactionType: string) => {
    setIsLoading(true)
    try {
      const result = await addReactionToReflection(
        reflectionId,
        reactionType as 'like' | 'love' | 'inspire' | 'helpful',
      )

      if (result.ok) {
        const count = localReactions[reactionType as keyof typeof localReactions] || 0
        if (result.removed) {
          // Remove reaction
          setLocalReactions({
            ...localReactions,
            [reactionType]: Math.max(0, count - 1),
          })
          setLocalUserReactions(
            localUserReactions.filter((r) => r !== reactionType),
          )
        } else {
          // Add reaction
          setLocalReactions({
            ...localReactions,
            [reactionType]: count + 1,
          })
          setLocalUserReactions([...localUserReactions, reactionType])
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Individual reaction buttons */}
      {reactionTypes.map((reaction) => {
        const count = localReactions[reaction.type as keyof typeof localReactions] || 0
        const isUserReacted = localUserReactions.includes(reaction.type)

        return (
          <Button
            key={reaction.type}
            variant={isUserReacted ? 'default' : 'outline'}
            size="sm"
            disabled={isLoading}
            onClick={() => handleReaction(reaction.type)}
            className="gap-1"
          >
            <span>{reaction.emoji}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </Button>
        )
      })}

      {/* Comment button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onCommentClick}
        className="gap-1 ml-2"
      >
        <MessageCircle className="h-4 w-4" />
        {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
      </Button>
    </div>
  )
}
