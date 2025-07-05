import { NextRequest } from 'next/server'
import { accessKeyManager } from '@/lib/access-keys'

export interface AuthResult {
  authorized: boolean
  key?: string
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
    const validation = await accessKeyManager.validateKey(accessKey)
    if (!validation.valid) {
      return {
        authorized: false,
        error: validation.error || 'Invalid access key'
      }
    }

    return {
      authorized: true,
      key: accessKey,
      remaining: validation.accessKey!.dailyLimit - validation.usage!.optimizationsToday,
      tier: validation.accessKey!.tier
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
    const result = await accessKeyManager.useOptimization(accessKey)
    return result
  } catch (error) {
    console.error('Usage tracking error:', error)
    return {
      success: false,
      error: 'Failed to track usage'
    }
  }
}