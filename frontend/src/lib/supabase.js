import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno no encontradas. Asegúrate de tener .env.local en local o configuradas en Vercel.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
