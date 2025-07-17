import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, optimizationCount, successRate, availableTokens } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Update or create user metrics in the database
    const { data, error } = await supabase
      .from('user_tokens')
      .update({
        optimization_count: optimizationCount,
        success_rate: successRate,
        usage_tokens: availableTokens,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()

    if (error) {
      console.error('Error updating user metrics:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data?.[0] || null
    })
  } catch (error) {
    console.error('User metrics API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}