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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const prompts = await UserAuthManager.getUserPrompts(user.id, limit)

    return NextResponse.json({
      success: true,
      data: prompts
    })
  } catch (error) {
    console.error('Prompt history error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}