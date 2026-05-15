'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface DeletePollModalProps {
  scheduleId: string
  scheduleTitle: string
  onDeleteSuccess?: () => void
  deletePoll: (scheduleId: string) => Promise<void>
  variant?: 'icon' | 'button'
}

export function DeletePollModal({
  scheduleId,
  scheduleTitle,
  onDeleteSuccess,
  deletePoll,
  variant = 'icon',
}: DeletePollModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deletePoll(scheduleId)
      toast.success('Poll deleted successfully')
      onDeleteSuccess?.()
    } catch (error) {
      console.error('[v0] Error deleting poll:', error)
      toast.error('Failed to delete poll. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Poll
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Poll?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the poll <span className="font-medium">"{scheduleTitle}"</span>? This action cannot be undone. All votes and responses will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-2 justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
