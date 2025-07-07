import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await UserAuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const { promptText, responseText, modelUsed } = await request.json()

    // Use a token
    const result = await UserAuthManager.useToken(user.id)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    // Save the prompt if provided
    if (promptText && responseText) {
      await UserAuthManager.savePrompt(user.id, promptText, responseText, modelUsed || 'gemini-2.5-flash')
    }

    return NextResponse.json({
      success: true,
      message: 'Token used successfully',
      remainingTokens: result.remainingTokens
    })
  } catch (error) {
    console.error('Token use error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}