import { createClient } from '@supabase/supabase-js'

// This should ONLY be used in server-side API routes or Server Actions
// when you need to bypass Row Level Security.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
