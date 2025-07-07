import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_tokens: {
        Row: {
          id: string
          user_id: string
          usage_tokens: number
          daily_optimizations: number
          total_optimizations: number
          last_reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_tokens?: number
          daily_optimizations?: number
          total_optimizations?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          usage_tokens?: number
          daily_optimizations?: number
          total_optimizations?: number
          last_reset_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_data: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_data: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_data?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_prompts: {
        Row: {
          id: string
          user_id: string
          prompt_text: string
          response_text: string
          model_used: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt_text: string
          response_text: string
          model_used: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt_text?: string
          response_text?: string
          model_used?: string
          created_at?: string
        }
      }
    }
  }
}