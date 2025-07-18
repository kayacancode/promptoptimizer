import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { OptimizationStorage } from '@/lib/optimization-storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const resolvedParams = await params
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storage = new OptimizationStorage()
    
    // First verify the session belongs to the user
    console.log('Looking for session ID:', resolvedParams.id)
    console.log('User ID:', user.id)
    
    const session = await storage.getOptimizationSession(resolvedParams.id)
    console.log('Found session:', session)
    
    if (!session) {
      console.log('Session not found in database')
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    if (session.user_id !== user.id) {
      console.log('Session belongs to different user. Session user_id:', session.user_id, 'Current user_id:', user.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'txt'

    if (format === 'json') {
      const jsonContent = await storage.exportOptimizationSession(resolvedParams.id)
      if (!jsonContent) {
        return NextResponse.json(
          { error: 'Failed to export session data' },
          { status: 500 }
        )
      }

      const filename = `optimization-session-${resolvedParams.id}-${new Date().toISOString().split('T')[0]}.json`
      
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      const textContent = await storage.generateDownloadContent(resolvedParams.id)
      if (!textContent) {
        return NextResponse.json(
          { error: 'Failed to generate download content' },
          { status: 500 }
        )
      }

      const filename = `optimization-session-${resolvedParams.id}-${new Date().toISOString().split('T')[0]}.txt`
      
      return new NextResponse(textContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
  } catch (error) {
    console.error('Error downloading optimization session:', error)
    return NextResponse.json(
      { error: 'Failed to download optimization session' },
      { status: 500 }
    )
  }
}