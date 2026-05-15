// Skip prerendering for this route since it's dynamic
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
