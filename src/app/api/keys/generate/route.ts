import { NextRequest, NextResponse } from 'next/server'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'
import { APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { email, tier = 'trial' }: { 
      email: string
      tier?: 'trial' | 'premium' | 'unlimited'
    } = await request.json()

    // Email is now required
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      } as APIResponse, { status: 400 })
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      } as APIResponse, { status: 400 })
    }

    // Create new access key
    const accessKey = await SupabaseAccessKeyManager.createAccessKey(email, tier)

    return NextResponse.json({
      success: true,
      data: {
        accessKey: accessKey.key,
        tier: accessKey.tier,
        dailyLimit: accessKey.dailyLimit,
        userId: accessKey.userId,
        createdAt: accessKey.createdAt
      },
      message: 'Access key generated successfully. Save this key - you\'ll need it to use AssitMe!'
    } as APIResponse)
  } catch (error) {
    console.error('Access key generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate access key'
    } as APIResponse, { status: 500 })
  }
}

// Get key information
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({
        success: false,
        error: 'Access key is required'
      } as APIResponse, { status: 400 })
    }

    const keyInfo = await SupabaseAccessKeyManager.getKeyInfo(key)

    if (!keyInfo.valid) {
      return NextResponse.json({
        success: false,
        error: keyInfo.error || 'Invalid access key'
      } as APIResponse, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      data: keyInfo.info,
      message: 'Key information retrieved successfully'
    } as APIResponse)
  } catch (error) {
    console.error('Key info retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve key info'
    } as APIResponse, { status: 500 })
  }
}