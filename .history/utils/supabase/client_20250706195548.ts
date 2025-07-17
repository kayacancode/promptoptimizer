import { createClient } from '@supabase/supabase-js'
import { Database } from '../../src/lib/supabase'

export const createClientComponentClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}