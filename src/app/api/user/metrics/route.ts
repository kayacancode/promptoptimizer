import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, optimizationCount, successRate, availableTokens, promptText, responseText, modelUsed } = await request.json()
    
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
        total_optimizations: optimizationCount,
        daily_optimizations: optimizationCount, // You may want to track this separately
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

    // Also store the optimization record in user_prompts if provided
    if (promptText && responseText && modelUsed) {
      const { error: promptError } = await supabase
        .from('user_prompts')
        .insert({
          user_id: userId,
          prompt_text: promptText,
          response_text: responseText,
          model_used: modelUsed,
          created_at: new Date().toISOString()
        })

      if (promptError) {
        console.error('Error storing prompt record:', promptError)
        // Don't fail the whole request if this fails
      }
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