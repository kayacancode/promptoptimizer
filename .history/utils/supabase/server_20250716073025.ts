import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type cookies } from 'next/headers'
import { Database } from '../../src/lib/supabase'

export const createSupabaseServerClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
} 