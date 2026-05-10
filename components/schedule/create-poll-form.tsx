'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Calendar } from 'lucide-react'

interface TimeOption {
  start_time: string
  end_time: string
}

interface CreatePollFormProps {
  onSubmit: (data: {
    title: string
    description: string
    location: string
    meeting_link: string
    voting_closes_at: string
    options: TimeOption[]
  }) => Promise<void>
  isLoading?: boolean
}

export function CreatePollForm({
  onSubmit,
  isLoading = false,
}: CreatePollFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [votingClosesAt, setVotingClosesAt] = useState('')
  const [options, setOptions] = useState<TimeOption[]>([
    { start_time: '', end_time: '' },
  ])
  const [open, setOpen] = useState(false)

  const handleAddOption = () => {
    setOptions([...options, { start_time: '', end_time: '' }])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (
    index: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const newOptions = [...options]
    newOptions[index][field] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSubmit({
      title,
      description,
      location,
      meeting_link: meetingLink,
      voting_closes_at: votingClosesAt,
      options,
    })

    // Reset form
    setTitle('')
    setDescription('')
    setLocation('')
    setMeetingLink('')
    setVotingClosesAt('')
    setOptions([{ start_time: '', end_time: '' }])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Scheduling Poll</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Phase 1 Kickoff Meeting"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this meeting about?"
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Room 101 or Virtual"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Meeting Link
              </label>
              <Input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/..."
                type="url"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Voting Closes At
            </label>
            <Input
              value={votingClosesAt}
              onChange={(e) => setVotingClosesAt(e.target.value)}
              type="datetime-local"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Time Options
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">
                      Start
                    </label>
                    <Input
                      type="datetime-local"
                      value={option.start_time}
                      onChange={(e) =>
                        handleOptionChange(index, 'start_time', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">
                      End
                    </label>
                    <Input
                      type="datetime-local"
                      value={option.end_time}
                      onChange={(e) =>
                        handleOptionChange(index, 'end_time', e.target.value)
                      }
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length === 1}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="mt-2"
            >
              <Plus className="mr-2 h-3 w-3" />
              Add Option
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
