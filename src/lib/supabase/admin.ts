import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { env } from '@/lib/env'

// Admin client: uses service_role key — NEVER import this in client components or expose it.
// Only use in Server Actions and Route Handlers.
export function createAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
