import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await UserAuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const tokens = await UserAuthManager.getUserTokens(user.id)
    
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'User tokens not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        usageTokens: tokens.usageTokens,
        dailyOptimizations: tokens.dailyOptimizations,
        totalOptimizations: tokens.totalOptimizations,
        lastResetDate: tokens.lastResetDate,
        createdAt: tokens.createdAt
      }
    })
  } catch (error) {
    console.error('Token info error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}