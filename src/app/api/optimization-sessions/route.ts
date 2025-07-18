import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { OptimizationStorage } from '@/lib/optimization-storage'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search')

    // Fetch sessions directly from database
    let query = supabase
      .from('optimization_sessions')
      .select(`
        *,
        optimization_results (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (search) {
      query = query.or(`original_prompt.ilike.%${search}%,optimized_prompt.ilike.%${search}%,explanation.ilike.%${search}%`)
    }

    const { data: sessions, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching sessions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch optimization sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sessions || []
    })
  } catch (error) {
    console.error('Error fetching optimization sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch optimization sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
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
      original_prompt,
      requirements_text,
      evaluation_input,
      optimized_prompt,
      explanation,
      overall_improvement_percentage,
      settings_used,
      is_completed,
      completion_timestamp
    } = body

    if (!original_prompt || !optimized_prompt || !explanation || !settings_used) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('Creating session for user:', user.id)
    console.log('Session data:', {
      user_id: user.id,
      session_name,
      original_prompt: original_prompt?.substring(0, 100) + '...',
      requirements_text,
      evaluation_input,
      optimized_prompt: optimized_prompt?.substring(0, 100) + '...',
      explanation,
      overall_improvement_percentage,
      settings_used,
      is_completed: is_completed || false
    })

    // Create session directly in the API route
    const { data: session, error: createError } = await supabase
      .from('optimization_sessions')
      .insert([{
        user_id: user.id,
        session_name,
        original_prompt,
        requirements_text,
        evaluation_input,
        optimized_prompt,
        explanation,
        overall_improvement_percentage,
        settings_used,
        is_completed: is_completed || false,
        completion_timestamp: completion_timestamp || (is_completed ? new Date().toISOString() : undefined)
      }])
      .select()
      .single()

    console.log('Session creation result:', session)
    console.log('Creation error:', createError)

    if (createError || !session) {
      console.error('Failed to create session:', createError)
      return NextResponse.json(
        { error: 'Failed to create optimization session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('Error creating optimization session:', error)
    return NextResponse.json(
      { error: 'Failed to create optimization session' },
      { status: 500 }
    )
  }
}