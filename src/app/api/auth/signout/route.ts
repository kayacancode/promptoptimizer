import { NextRequest, NextResponse } from 'next/server'
import { UserAuthManager } from '@/lib/user-auth'

export async function POST(request: NextRequest) {
  try {
    const result = await UserAuthManager.signOut()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully signed out'
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Signout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}