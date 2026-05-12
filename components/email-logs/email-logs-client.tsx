'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EmailLogEntry } from '@/lib/email/types'

const STATUS_COLORS = {
  sent: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  bounced: 'bg-orange-50 text-orange-700 border-orange-200',
}

const STATUS_ICONS = {
  sent: <CheckCircle2 className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  bounced: <AlertCircle className="h-4 w-4" />,
}

interface EmailLogsClientProps {
  initialLogs: EmailLogEntry[]
  failedEmailCount: number
  currentPage: number
  totalLogs: number
  pageCount: number
}

export function EmailLogsClient({
  initialLogs,
  failedEmailCount,
  currentPage,
  totalLogs,
  pageCount,
}: EmailLogsClientProps) {
  const [logs, setLogs] = useState<EmailLogEntry[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending' | 'bounced'>('all')
  const [isRetrying, setIsRetrying] = useState(false)

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleRetryFailed = async () => {
    setIsRetrying(true)
    try {
      const response = await fetch('/api/admin/email-logs/retry-failed', {
        method: 'POST',
      })
      if (response.ok) {
        // Refetch logs
        window.location.reload()
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const handleResendEmail = async (logId: string) => {
    try {
      const response = await fetch(`/api/admin/email-logs/${logId}/resend`, {
        method: 'POST',
      })
      if (response.ok) {
        // Update the log status
        const updatedLogs = logs.map((log) =>
          log.id === logId ? { ...log, status: 'pending' as const } : log
        )
        setLogs(updatedLogs)
      }
    } catch (err) {
      console.error('[v0] Failed to resend email:', err)
    }
  }

  const failedCount = logs.filter((log) => log.status === 'failed').length
  const sentCount = logs.filter((log) => log.status === 'sent').length
  const pendingCount = logs.filter((log) => log.status === 'pending').length

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Emails</p>
                <p className="text-2xl font-bold text-foreground">{totalLogs}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successfully Sent</p>
                <p className="text-2xl font-bold text-green-600">{sentCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Email History (Past 7 Days)</span>
            {failedCount > 0 && (
              <Button
                onClick={handleRetryFailed}
                disabled={isRetrying}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {isRetrying ? 'Retrying...' : `Retry Failed (${failedCount})`}
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            View all emails sent in the past 7 days with delivery status
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email, recipient name, or subject..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value: any) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Logs Table */}
          <div className="overflow-x-auto">
            {filteredLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">No emails found</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Sent
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">{log.recipient_email}</p>
                          {log.recipient_name && (
                            <p className="text-xs text-muted-foreground">{log.recipient_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-xs truncate text-foreground" title={log.subject}>
                          {log.subject}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="capitalize">
                          {log.email_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {STATUS_ICONS[log.status as keyof typeof STATUS_ICONS]}
                          <Badge
                            className={`capitalize ${STATUS_COLORS[log.status as keyof typeof STATUS_COLORS]}`}
                            variant="outline"
                          >
                            {log.status}
                          </Badge>
                        </div>
                        {log.error_message && (
                          <p className="mt-1 text-xs text-red-600">{log.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.sent_at || log.created_at), 'MMM d, HH:mm')}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {log.status === 'failed' && (
                            <Button
                              onClick={() => handleResendEmail(log.id)}
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              title="Resend this email"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span className="hidden sm:inline">Resend</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {pageCount} ({totalLogs} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  asChild={currentPage > 1}
                >
                  {currentPage > 1 ? (
                    <a href={`/admin/email-logs?page=${currentPage - 1}`} className="flex items-center gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </a>
                  ) : (
                    <>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === pageCount}
                  asChild={currentPage < pageCount}
                >
                  {currentPage < pageCount ? (
                    <a href={`/admin/email-logs?page=${currentPage + 1}`} className="flex items-center gap-1">
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
