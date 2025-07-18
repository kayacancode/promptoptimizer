import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { OptimizationStorage } from '@/lib/optimization-storage'

export async function POST(
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

    const body = await request.json()
    const { results } = body

    if (!results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Invalid results data' },
        { status: 400 }
      )
    }

    const storage = new OptimizationStorage()
    
    // First verify the session belongs to the user
    const session = await storage.getOptimizationSession(resolvedParams.id)
    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const savedResults = await storage.saveOptimizationResults(resolvedParams.id, results)

    if (!savedResults || savedResults.length === 0) {
      return NextResponse.json(
        { error: 'Failed to save optimization results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedResults
    })
  } catch (error) {
    console.error('Error saving optimization results:', error)
    return NextResponse.json(
      { error: 'Failed to save optimization results' },
      { status: 500 }
    )
  }
}