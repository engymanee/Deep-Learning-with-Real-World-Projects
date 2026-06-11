'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

type School = {
  id: string
  name: string
  icon_url: string | null
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('schools')
          .select('id, name, icon_url')
          .order('name', { ascending: true })

        if (err) throw err
        setSchools(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schools')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSchools()
  }, [])

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-balance font-serif text-4xl text-foreground">
          Partner Schools
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Meet the schools and leadership teams in our program.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex gap-4 p-6">
                <div className="h-16 w-16 rounded-md bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && schools.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              No schools added yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Schools Grid */}
      {!isLoading && schools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schools.map((school) => (
            <Card
              key={school.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="flex gap-4 p-6">
                {school.icon_url ? (
                  <img
                    src={school.icon_url}
                    alt={school.name}
                    className="h-16 w-16 rounded-md object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{school.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    School Profile
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
