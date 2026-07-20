import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This client uses the service role key and bypasses RLS.
// It should ONLY be used in server actions/environments, NEVER exposed to the client.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
