import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export async function GET(request: NextRequest) {
  try {
    const stats = await UserAuthManager.getUsageStats()

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Usage stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}