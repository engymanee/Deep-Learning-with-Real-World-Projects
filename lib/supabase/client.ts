import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Create a proxy that throws a clear error only when methods are called
    return new Proxy({} as any, {
      get: (target, prop) => {
        return () => {
          throw new Error(
            "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
          )
        }
      }
    })
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
