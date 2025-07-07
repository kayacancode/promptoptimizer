import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserAuthManager } from '@/lib/user-auth'

export interface TokenAuthResult {
  authorized: boolean
  userId?: string
  remainingTokens?: number
  error?: string
}

export async function authenticateTokenRequest(request: NextRequest): Promise<TokenAuthResult> {
  try {
    // Get auth cookies from the request
    const cookieHeader = request.headers.get('cookie')
    
    if (!cookieHeader) {
      return {
        authorized: false,
        error: 'No authentication cookies found. Please sign in to continue.'
      }
    }

    // Extract access token from cookies
    const cookies = new Map()
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      cookies.set(name, value)
    })

    const accessToken = cookies.get('sb-access-token') || 
                       cookies.get('supabase-auth-token') ||
                       cookies.get('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\//, '').replace(/\./g, '-') + '-auth-token')

    if (!accessToken) {
      console.log('No access token found in cookies')
      return {
        authorized: false,
        error: 'Authentication token not found. Please sign in to continue.'
      }
    }

    // Create server-side Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get user using the access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    
    if (error || !user) {
      console.error('Error getting user from token:', error)
      return {
        authorized: false,
        error: 'Invalid authentication token. Please sign in again.'
      }
    }

    // Get user tokens
    const userTokens = await UserAuthManager.getUserTokens(user.id)
    if (!userTokens) {
      return {
        authorized: false,
        error: 'User tokens not found. Please contact support.'
      }
    }

    return {
      authorized: true,
      userId: user.id,
      remainingTokens: userTokens.usageTokens
    }
  } catch (error) {
    console.error('Token authentication error:', error)
    return {
      authorized: false,
      error: 'Authentication failed'
    }
  }
}

export async function requireTokenUsage(userId: string): Promise<{
  success: boolean
  remainingTokens?: number
  error?: string
}> {
  try {
    // Use a token
    const result = await UserAuthManager.useToken(userId)
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to use token'
      }
    }

    return {
      success: true,
      remainingTokens: result.remainingTokens
    }
  } catch (error) {
    console.error('Token usage error:', error)
    return {
      success: false,
      error: 'Failed to use token'
    }
  }
}