import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side authentication helper
async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authorized: false, error: 'Authorization header missing or invalid' }
    }

    const token = authHeader.substring(7)
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { authorized: false, error: 'Invalid authentication token' }
    }

    return {
      authorized: true,
      userId: user.id,
      user
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { authorized: false, error: 'Authentication failed' }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (!auth.authorized) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'Unauthorized'
      }, { status: 401 })
    }

    // Create server-side Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's token data from user_tokens table
    const { data: tokenData, error } = await supabase
      .from('user_tokens')
      .select('usage_tokens, daily_optimizations, total_optimizations, last_reset_date')
      .eq('user_id', auth.userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user tokens:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user tokens'
      }, { status: 500 })
    }

    // If no token record exists, create one with default values
    if (!tokenData) {
      const defaultTokenData = {
        user_id: auth.userId,
        usage_tokens: 10000, // Default 10k tokens
        daily_optimizations: 0,
        total_optimizations: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      }

      const { data: newTokenData, error: createError } = await supabase
        .from('user_tokens')
        .insert(defaultTokenData)
        .select()
        .single()

      if (createError) {
        console.error('Error creating user tokens:', createError)
        return NextResponse.json({
          success: false,
          error: 'Failed to create user tokens'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: {
          tokenBalance: newTokenData.usage_tokens,
          dailyTokenLimit: 10, // 10 optimizations per day in beta
          tokensUsedToday: newTokenData.daily_optimizations,
          remainingDailyTokens: 10 - newTokenData.daily_optimizations,
          totalOptimizations: newTokenData.total_optimizations
        }
      })
    }

    // Check if we need to reset daily usage
    const today = new Date().toISOString().split('T')[0]
    const lastResetDate = tokenData.last_reset_date

    if (lastResetDate !== today) {
      // Reset daily usage
      const { error: resetError } = await supabase
        .from('user_tokens')
        .update({
          daily_optimizations: 0,
          last_reset_date: today
        })
        .eq('user_id', auth.userId)

      if (resetError) {
        console.error('Error resetting daily usage:', resetError)
      } else {
        tokenData.daily_optimizations = 0
        tokenData.last_reset_date = today
      }
    }

    const dailyLimit = 10 // 10 optimizations per day in beta

    return NextResponse.json({
      success: true,
      data: {
        tokenBalance: tokenData.usage_tokens,
        dailyTokenLimit: dailyLimit,
        tokensUsedToday: tokenData.daily_optimizations,
        remainingDailyTokens: dailyLimit - tokenData.daily_optimizations,
        totalOptimizations: tokenData.total_optimizations
      }
    })
  } catch (error) {
    console.error('Balance API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user balance'
    }, { status: 500 })
  }
}