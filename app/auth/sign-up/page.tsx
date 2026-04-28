import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SignUpRetiredPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="font-serif text-2xl">
              Invite-only program
            </CardTitle>
            <CardDescription>
              Wisdom At Work Fellows are enrolled by program administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-text-muted leading-relaxed">
              If you&apos;ve been accepted into the program, watch your inbox
              for an invitation from your program administrator. The email
              will include a link to set your password and sign in.
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              Haven&apos;t received an invite? Reach out to your school team
              facilitator or the program office.
            </p>
            <Link href="/auth/login" className="block">
              <Button variant="outline" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
