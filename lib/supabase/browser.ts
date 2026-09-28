'use client'

import { createClient } from '@supabase/supabase-js'

export const browserSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export async function getOwnerAuthHeader() {
  const { data: { session } } = await browserSupabase.auth.getSession()
  if (!session?.access_token) return null
  return { Authorization: `Bearer ${session.access_token}` }
}
