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

    // Check current table status
    const results = {
      users: false,
      user_tokens: false
    }
    
    try {
      const { error: usersError } = await adminClient.from('users').select('id').limit(1)
      results.users = !usersError
    } catch (e) {
      // Table doesn't exist
    }

    try {
      const { error: tokensError } = await adminClient.from('user_tokens').select('id').limit(1)
      results.user_tokens = !tokensError
    } catch (e) {
      // Table doesn't exist
    }

    // If both tables exist, we're done
    if (results.users && results.user_tokens) {
      return NextResponse.json({
        success: true,
        message: 'Essential tables already exist',
        tablesCreated: results
      })
    }

    // Create essential tables only
    const minimalSQL = `
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

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
`

    // Re-check after potential creation (in case user created them manually)
    const finalCheck = { users: false, user_tokens: false }

    try {
      const { error: usersError } = await adminClient.from('users').select('id').limit(1)
      finalCheck.users = !usersError
    } catch (e) {
      // Table still doesn't exist
    }

    try {
      const { error: tokensError } = await adminClient.from('user_tokens').select('id').limit(1)
      finalCheck.user_tokens = !tokensError
    } catch (e) {
      // Table still doesn't exist
    }

    if (finalCheck.users && finalCheck.user_tokens) {
      return NextResponse.json({
        success: true,
        message: 'Essential tables now exist',
        tablesCreated: finalCheck
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Tables need to be created manually',
        tablesCreated: finalCheck,
        sqlToRun: minimalSQL,
        note: 'Automatic table creation is not supported. Please run the provided SQL manually in your Supabase SQL editor.'
      })
    }

  } catch (error) {
    console.error('Minimal table initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize essential tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        sqlToRun: `-- Essential tables for PromptLoop signup:
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
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);`
      },
      { status: 500 }
    )
  }
} 