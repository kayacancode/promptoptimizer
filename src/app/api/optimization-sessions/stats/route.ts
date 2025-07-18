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

    // Get stats directly from database
    const { data: sessions, error: statsError } = await supabase
      .from('optimization_sessions')
      .select('is_completed, overall_improvement_percentage')
      .eq('user_id', user.id)

    if (statsError) {
      console.error('Error fetching stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch optimization stats' },
        { status: 500 }
      )
    }

    const completedSessions = sessions.filter(s => s.is_completed)
    const improvementPercentages = completedSessions
      .map(s => s.overall_improvement_percentage)
      .filter(p => p !== null && p !== undefined) as number[]

    const averageImprovement = improvementPercentages.length > 0 
      ? improvementPercentages.reduce((sum, p) => sum + p, 0) / improvementPercentages.length
      : 0

    const stats = {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      averageImprovement,
      totalOptimizations: completedSessions.length
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching optimization stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch optimization stats' },
      { status: 500 }
    )
  }
}