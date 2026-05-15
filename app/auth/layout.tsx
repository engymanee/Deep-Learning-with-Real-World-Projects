// Skip prerendering for auth routes since they may need dynamic data
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
