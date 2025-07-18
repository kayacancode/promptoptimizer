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
    const session = await storage.getOptimizationSession(resolvedParams.id)

    if (!session) {
      return NextResponse.json(
        { error: 'Optimization session not found' },
        { status: 404 }
      )
    }

    // Verify the session belongs to the authenticated user
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Error fetching optimization session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch optimization session' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const {
      session_name,
      requirements_text,
      evaluation_input,
      optimized_prompt,
      explanation,
      overall_improvement_percentage,
      settings_used,
      is_completed,
      completion_timestamp
    } = body

    const storage = new OptimizationStorage()
    
    // First verify the session belongs to the user
    const existingSession = await storage.getOptimizationSession(resolvedParams.id)
    if (!existingSession || existingSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updatedSession = await storage.updateOptimizationSession(resolvedParams.id, {
      session_name,
      requirements_text,
      evaluation_input,
      optimized_prompt,
      explanation,
      overall_improvement_percentage,
      settings_used,
      is_completed,
      completion_timestamp
    })

    if (!updatedSession) {
      return NextResponse.json(
        { error: 'Failed to update optimization session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSession
    })
  } catch (error) {
    console.error('Error updating optimization session:', error)
    return NextResponse.json(
      { error: 'Failed to update optimization session' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const existingSession = await storage.getOptimizationSession(resolvedParams.id)
    if (!existingSession || existingSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const success = await storage.deleteOptimizationSession(resolvedParams.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete optimization session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Optimization session deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting optimization session:', error)
    return NextResponse.json(
      { error: 'Failed to delete optimization session' },
      { status: 500 }
    )
  }
}