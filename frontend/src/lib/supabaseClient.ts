import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Vite exposes env vars via import.meta.env — set these in frontend/.env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabaseClient] Missing env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local'
  )
}

// Singleton — import this everywhere instead of calling createClient() yourself.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
