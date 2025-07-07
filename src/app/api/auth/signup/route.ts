import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await UserAuthManager.signUp(email, password)
    
    if (result.success) {
      // Check if user has tokens to determine the message
      const tokens = await UserAuthManager.getUserTokens(result.user.id)
      
      const message = tokens 
        ? 'Account created successfully! You have 10 free tokens per day.'
        : 'Account created successfully! Token system will be available once fully configured.'

      return NextResponse.json({
        success: true,
        message,
        user: result.user,
        hasTokens: !!tokens
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}