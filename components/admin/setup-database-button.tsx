'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SetupDatabaseButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setStatus('idle')
    setMessage('')

    try {
      console.log('[v0] Calling database setup API...')
      const response = await fetch('/api/admin/custom-pages/setup', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.message || 'Database setup complete!')
        console.log('[v0] Setup succeeded:', data)
      } else {
        setStatus('error')
        setMessage(data.message || data.error || 'Setup failed')
        console.log('[v0] Setup failed:', data)
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      console.error('[v0] Setup error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {status === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSetup}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          'Initialize Custom Pages Database'
        )}
      </Button>
    </div>
  )
}
