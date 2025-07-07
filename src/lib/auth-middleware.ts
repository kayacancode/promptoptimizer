import { NextRequest } from 'next/server'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'

export interface AuthResult {
  authorized: boolean
  key?: string
  userId?: string
  remaining?: number
  error?: string
  tier?: string
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get access key from Authorization header or query param
    const authHeader = request.headers.get('authorization')
    const queryKey = request.nextUrl.searchParams.get('key')
    
    let accessKey: string | null = null
    
    if (authHeader?.startsWith('Bearer ')) {
      accessKey = authHeader.substring(7)
    } else if (queryKey) {
      accessKey = queryKey
    }
    
    if (!accessKey) {
      return {
        authorized: false,
        error: 'Access key is required. Get your key at /api/keys/generate'
      }
    }

    // Validate the key
    const validation = await SupabaseAccessKeyManager.getKeyInfo(accessKey)
    if (!validation.valid) {
      return {
        authorized: false,
        error: validation.error || 'Invalid access key'
      }
    }

    return {
      authorized: true,
      key: accessKey,
      userId: validation.info!.userId,
      remaining: validation.info!.dailyLimit - validation.info!.dailyUsage,
      tier: validation.info!.tier
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      authorized: false,
      error: 'Authentication failed'
    }
  }
}

export async function requireOptimizationUsage(accessKey: string): Promise<{
  success: boolean
  remaining?: number
  error?: string
}> {
  try {
    // First get the current key info to check limits
    const keyInfo = await SupabaseAccessKeyManager.getKeyInfo(accessKey)
    if (!keyInfo.valid) {
      return {
        success: false,
        error: keyInfo.error || 'Invalid access key'
      }
    }

    // Check if user has reached daily limit
    if (keyInfo.info!.dailyUsage >= keyInfo.info!.dailyLimit) {
      return {
        success: false,
        remaining: 0,
        error: `Daily limit of ${keyInfo.info!.dailyLimit} optimizations reached. Upgrade for more!`
      }
    }

    // Increment usage
    const incrementResult = await SupabaseAccessKeyManager.incrementUsage(accessKey)
    if (!incrementResult) {
      return {
        success: false,
        error: 'Failed to increment usage'
      }
    }

    // Return updated remaining count
    const remaining = keyInfo.info!.dailyLimit - keyInfo.info!.dailyUsage - 1
    return {
      success: true,
      remaining
    }
  } catch (error) {
    console.error('Usage tracking error:', error)
    return {
      success: false,
      error: 'Failed to track usage'
    }
  }
}