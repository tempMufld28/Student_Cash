import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(`VITE_SUPABASE_URL must start with https:// — got: "${supabaseUrl}"`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
