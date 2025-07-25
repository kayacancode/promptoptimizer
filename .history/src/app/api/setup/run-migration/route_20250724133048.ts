import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const results = []

    // Step 1: Create users table
    try {
      const { error: usersError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
      results.push({ step: 'Create users table', success: !usersError, error: usersError?.message })
    } catch (err) {
      results.push({ step: 'Create users table', success: false, error: (err as Error).message })
    }

    // Step 2: Create access_keys table
    try {
      const { error: keysError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS access_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            key VARCHAR(255) UNIQUE NOT NULL,
            tier VARCHAR(20) DEFAULT 'trial' CHECK (tier IN ('trial', 'premium', 'unlimited')),
            daily_limit INTEGER DEFAULT 100,
            daily_usage INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })
      results.push({ step: 'Create access_keys table', success: !keysError, error: keysError?.message })
    } catch (err) {
      results.push({ step: 'Create access_keys table', success: false, error: (err as Error).message })
    }

    // Step 3: Create indexes
    try {
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_access_keys_user_id ON access_keys(user_id);
          CREATE INDEX IF NOT EXISTS idx_access_keys_key ON access_keys(key);
          CREATE INDEX IF NOT EXISTS idx_access_keys_active ON access_keys(is_active);
        `
      })
      results.push({ step: 'Create indexes', success: !indexError, error: indexError?.message })
    } catch (err) {
      results.push({ step: 'Create indexes', success: false, error: (err as Error).message })
    }

    // Alternative approach if RPC doesn't work - use direct SQL execution
    if (results.some(r => !r.success)) {
      return NextResponse.json({
        success: false,
        message: 'Some migration steps failed. Please run the SQL manually in Supabase dashboard.',
        results,
        sqlFile: 'create-api-keys-tables.sql',
        instructions: [
          '1. Go to your Supabase project dashboard',
          '2. Navigate to SQL Editor',
          '3. Copy and paste the contents of create-api-keys-tables.sql',
          '4. Execute the SQL statements',
          '5. Verify tables are created in Table Editor'
        ]
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      results
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      message: 'Please run the migration manually using the provided SQL file'
    }, { status: 500 })
  }
}

// Check migration status
export async function GET() {
  try {
    // Try to query the tables to see if they exist
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    const { data: keysData, error: keysError } = await supabase
      .from('access_keys')
      .select('id')
      .limit(1)

    const usersTableExists = !usersError || !usersError.message.includes('does not exist')
    const keysTableExists = !keysError || !keysError.message.includes('does not exist')

    return NextResponse.json({
      success: true,
      data: {
        usersTableExists,
        keysTableExists,
        migrationComplete: usersTableExists && keysTableExists,
        errors: {
          users: usersError?.message,
          access_keys: keysError?.message
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status'
    }, { status: 500 })
  }
}