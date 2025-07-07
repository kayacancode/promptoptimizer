import { NextRequest, NextResponse } from 'next/server'
import { SupabaseAccessKeyManager } from '@/lib/supabase-access-keys'
import { APIResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { key, tier }: { 
      key: string
      tier: 'premium' | 'unlimited'
    } = await request.json()

    if (!key) {
      return NextResponse.json({
        success: false,
        error: 'Access key is required'
      } as APIResponse, { status: 400 })
    }

    if (!tier || !['premium', 'unlimited'].includes(tier)) {
      return NextResponse.json({
        success: false,
        error: 'Valid tier is required (premium or unlimited)'
      } as APIResponse, { status: 400 })
    }

    const result = await SupabaseAccessKeyManager.upgradeKey(key, tier)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to upgrade key'
      } as APIResponse, { status: 400 })
    }

    // Get updated key info
    const keyInfo = await SupabaseAccessKeyManager.getKeyInfo(key)

    return NextResponse.json({
      success: true,
      data: keyInfo.info,
      message: `Access key upgraded to ${tier} tier successfully!`
    } as APIResponse)
  } catch (error) {
    console.error('Key upgrade error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upgrade key'
    } as APIResponse, { status: 500 })
  }
}