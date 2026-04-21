'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Program {
  id: string
  title: string
  description: string
  year: string
  start_date: string
  end_date: string
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPrograms = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('year', { ascending: true })

      if (!error && data) {
        setPrograms(data)
      }
      setLoading(false)
    }

    loadPrograms()
  }, [])

  const yearLabels: Record<string, string> = {
    year_one: 'Year One: Deep Learning',
    year_two: 'Year Two: Wisdom Coaching',
    year_three: 'Year Three: Community of Practice',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              ← Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Professional Development Programs</h1>
          <p className="text-gray-600 mt-2">Choose a program to view modules and enroll</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {programs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500 text-center py-8">No programs available yet. Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            programs.map((program) => (
              <Link key={program.id} href={`/programs/${program.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>{yearLabels[program.year] || program.title}</CardTitle>
                    <CardDescription>
                      {program.start_date && program.end_date
                        ? `${new Date(program.start_date).toLocaleDateString()} - ${new Date(program.end_date).toLocaleDateString()}`
                        : 'Dates TBD'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{program.description}</p>
                    <div className="mt-4">
                      <Button className="w-full">View Program</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
