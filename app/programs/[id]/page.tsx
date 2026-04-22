'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { BookOpen, Clock, Users } from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  duration_hours: number
  module_type: string
  order_number: number
}

interface Program {
  id: string
  title: string
  description: string
  year: string
  start_date: string
  end_date: string
}

export default function ProgramDetailPage() {
  const params = useParams()
  const programId = params.id as string

  const [program, setProgram] = useState<Program | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadProgram = async () => {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      // Get program details
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single()

      if (programData) {
        setProgram(programData)
      }

      // Get modules
      const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .eq('program_id', programId)
        .order('order_number', { ascending: true })

      if (modulesData) {
        setModules(modulesData)
      }

      // Check if user is enrolled
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('program_id', programId)
          .single()

        setEnrolled(!!enrollmentData)
      }

      setLoading(false)
    }

    loadProgram()
  }, [programId])

  const handleEnroll = async () => {
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id,
      program_id: programId,
      status: 'enrolled',
    })

    if (!error) {
      setEnrolled(true)
    }
  }

  const yearLabels: Record<string, string> = {
    year_one: 'Deep Learning',
    year_two: 'Wisdom Coaching',
    year_three: 'Community of Practice',
  }

  const moduleTypeLabels: Record<string, string> = {
    listening_session: 'Listening Session',
    interactive_module: 'Interactive Module',
    field_work: 'Field Work',
    coaching: 'Team Coaching',
    implementation: 'Implementation',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Link href="/programs">
            <Button variant="outline" className="mb-4">
              ← Back
            </Button>
          </Link>
          <p className="text-gray-600">Program not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link href="/programs">
          <Button variant="outline" className="mb-6">
            ← Back to Programs
          </Button>
        </Link>

        {/* Program Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {yearLabels[program.year] || program.title}
          </h1>
          <p className="text-gray-600 mb-6">{program.description}</p>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-700">
              <BookOpen className="w-5 h-5" />
              <span>{modules.length} Modules</span>
            </div>
            {program.start_date && program.end_date && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5" />
                <span>
                  {new Date(program.start_date).toLocaleDateString()} -{' '}
                  {new Date(program.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {enrolled ? (
            <Badge className="bg-green-100 text-green-800">Enrolled</Badge>
          ) : (
            <Button onClick={handleEnroll} size="lg">
              Enroll in Program
            </Button>
          )}
        </div>

        {/* Modules */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Program Modules</h2>

          {modules.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8">No modules available yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <Card key={module.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                            Module {module.order_number}
                          </span>
                          <Badge variant="outline">
                            {moduleTypeLabels[module.module_type] || module.module_type}
                          </Badge>
                        </div>
                        <CardTitle>{module.title}</CardTitle>
                        <CardDescription className="mt-1">{module.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {module.duration_hours && (
                        <div>
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="font-semibold">{module.duration_hours} hours</p>
                        </div>
                      )}
                      {module.start_date && (
                        <div>
                          <p className="text-sm text-gray-600">Dates</p>
                          <p className="font-semibold">
                            {module.end_date
                              ? `${new Date(module.start_date).toLocaleDateString()} - ${new Date(module.end_date).toLocaleDateString()}`
                              : new Date(module.start_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {enrolled && (
                      <Button className="w-full" variant="outline">
                        View Module
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
