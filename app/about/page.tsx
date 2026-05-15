import { redirect } from 'next/navigation'

export default function AboutPage() {
  // Redirect to the new custom pages route for about
  redirect('/pages/about')
}

