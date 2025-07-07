import { NextRequest } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export interface TokenAuthResult {
  authorized: boolean
  userId?: string
  remainingTokens?: number
  error?: string
}

export async function authenticateTokenRequest(request: NextRequest): Promise<TokenAuthResult> {
  try {
    // Get the current user from Supabase Auth session
    const user = await UserAuthManager.getCurrentUser()
    
    if (!user) {
      return {
        authorized: false,
        error: 'User not authenticated. Please sign in to continue.'
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