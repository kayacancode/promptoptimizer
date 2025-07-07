import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Create admin client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Creating database tables...')

    const results = {
      users: false,
      user_tokens: false,
      user_prompts: false,
      user_sessions: false,
      errors: [] as string[]
    }

    // Try to check if tables exist by querying them
    try {
      const { error: usersError } = await adminClient.from('users').select('id').limit(1)
      results.users = !usersError
      console.log('Users table exists:', results.users)
    } catch (e) {
      console.log('Users table check failed')
    }

    try {
      const { error: tokensError } = await adminClient.from('user_tokens').select('id').limit(1)
      results.user_tokens = !tokensError
      console.log('User_tokens table exists:', results.user_tokens)
    } catch (e) {
      console.log('User_tokens table check failed')
    }

    try {
      const { error: promptsError } = await adminClient.from('user_prompts').select('id').limit(1)
      results.user_prompts = !promptsError
      console.log('User_prompts table exists:', results.user_prompts)
    } catch (e) {
      console.log('User_prompts table check failed')
    }

    try {
      const { error: sessionsError } = await adminClient.from('user_sessions').select('id').limit(1)
      results.user_sessions = !sessionsError
      console.log('User_sessions table exists:', results.user_sessions)
    } catch (e) {
      console.log('User_sessions table check failed')
    }

    // If all tables exist, we're done
    if (results.users && results.user_tokens && results.user_prompts && results.user_sessions) {
      return NextResponse.json({
        success: true,
        message: 'All tables already exist',
        tablesCreated: results
      })
    }

    // Try to create tables using SQL execution
    const tableSQL = `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_tokens INTEGER DEFAULT 10,
  daily_optimizations INTEGER DEFAULT 0,
  total_optimizations INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_prompts table
CREATE TABLE IF NOT EXISTS user_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  model_used TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_last_reset_date ON user_tokens(last_reset_date);
CREATE INDEX IF NOT EXISTS idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_created_at ON user_prompts(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
`

    // Try using the SQL method (PostgREST)
    try {
      const { data, error } = await adminClient
        .from('_postgrest_sql')
        .insert({ query: tableSQL })

      if (error) {
        console.log('PostgREST SQL method failed:', error.message)
        results.errors.push(`PostgREST: ${error.message}`)
      } else {
        console.log('Tables created via PostgREST SQL')
      }
    } catch (e) {
      console.log('PostgREST SQL method not available')
    }

    // Alternative: Try using pg admin queries if available
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_sql_query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({ query: tableSQL })
      })

      if (response.ok) {
        console.log('Tables created via pg_sql_query RPC')
      } else {
        console.log('pg_sql_query RPC failed:', response.statusText)
      }
    } catch (e) {
      console.log('pg_sql_query RPC not available')
    }

    // Re-check tables after creation attempts
    const finalCheck = {
      users: false,
      user_tokens: false,
      user_prompts: false,
      user_sessions: false
    }

    try {
      const { error: usersError } = await adminClient.from('users').select('id').limit(1)
      finalCheck.users = !usersError
    } catch (e) {}

    try {
      const { error: tokensError } = await adminClient.from('user_tokens').select('id').limit(1)
      finalCheck.user_tokens = !tokensError
    } catch (e) {}

    try {
      const { error: promptsError } = await adminClient.from('user_prompts').select('id').limit(1)
      finalCheck.user_prompts = !promptsError
    } catch (e) {}

    try {
      const { error: sessionsError } = await adminClient.from('user_sessions').select('id').limit(1)
      finalCheck.user_sessions = !sessionsError
    } catch (e) {}

    const allTablesExist = finalCheck.users && finalCheck.user_tokens && finalCheck.user_prompts && finalCheck.user_sessions

    if (allTablesExist) {
      return NextResponse.json({
        success: true,
        message: 'All tables created successfully',
        tablesCreated: finalCheck
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some tables may not have been created',
        tablesCreated: finalCheck,
        sqlToRun: tableSQL,
        note: 'Please run the provided SQL manually in your Supabase SQL editor'
      })
    }

  } catch (error) {
    console.error('Table initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        sqlToRun: `-- Run this SQL manually in your Supabase dashboard:
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_tokens INTEGER DEFAULT 10,
  daily_optimizations INTEGER DEFAULT 0,
  total_optimizations INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);`
      },
      { status: 500 }
    )
  }
} 