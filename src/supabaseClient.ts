import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  console.warn(
    'Please configure your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the .env file.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
