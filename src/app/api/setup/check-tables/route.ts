import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
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


    const results = {
      users: { exists: false, error: null as string | null },
      user_tokens: { exists: false, error: null as string | null },
      user_prompts: { exists: false, error: null as string | null },
      user_sessions: { exists: false, error: null as string | null }
    }

    // Check users table
    try {
      const { data, error } = await adminClient.from('users').select('id').limit(1)
      results.users.exists = !error
      if (error) results.users.error = error.message
    } catch (e) {
      results.users.error = e instanceof Error ? e.message : 'Unknown error'
    }

    // Check user_tokens table
    try {
      const { data, error } = await adminClient.from('user_tokens').select('id').limit(1)
      results.user_tokens.exists = !error
      if (error) results.user_tokens.error = error.message
    } catch (e) {
      results.user_tokens.error = e instanceof Error ? e.message : 'Unknown error'
    }

    // Check user_prompts table
    try {
      const { data, error } = await adminClient.from('user_prompts').select('id').limit(1)
      results.user_prompts.exists = !error
      if (error) results.user_prompts.error = error.message
    } catch (e) {
      results.user_prompts.error = e instanceof Error ? e.message : 'Unknown error'
    }

    // Check user_sessions table
    try {
      const { data, error } = await adminClient.from('user_sessions').select('id').limit(1)
      results.user_sessions.exists = !error
      if (error) results.user_sessions.error = error.message
    } catch (e) {
      results.user_sessions.error = e instanceof Error ? e.message : 'Unknown error'
    }

    const allEssentialExist = results.users.exists && results.user_tokens.exists
    const allExist = allEssentialExist && results.user_prompts.exists && results.user_sessions.exists

    return NextResponse.json({
      success: true,
      message: `Tables checked. Essential tables exist: ${allEssentialExist}, All tables exist: ${allExist}`,
      tables: results,
      summary: {
        essential: allEssentialExist,
        complete: allExist,
        missingEssential: !allEssentialExist ? 
          Object.keys(results).filter(table => 
            (table === 'users' || table === 'user_tokens') && !results[table as keyof typeof results].exists
          ) : [],
        missingOptional: !allExist ? 
          Object.keys(results).filter(table => 
            (table === 'user_prompts' || table === 'user_sessions') && !results[table as keyof typeof results].exists
          ) : []
      }
    })

  } catch (error) {
    console.error('Table check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 