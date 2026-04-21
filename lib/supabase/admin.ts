import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for privileged server-side operations.
 *
 * NEVER import this from client code. Use only inside server actions,
 * route handlers, or other server-only code paths.
 *
 * Bypasses Row Level Security, so every call site must authorize the
 * caller themselves (e.g. require the current user to be role='admin').
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    )
  }

  return createSupabaseJsClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
