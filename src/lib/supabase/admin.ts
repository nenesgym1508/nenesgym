import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Admin client: uses service_role key — NEVER import this in client components or expose it.
// Only use in Server Actions and Route Handlers.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin env vars not set')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
