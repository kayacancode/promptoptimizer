import { NextRequest, NextResponse } from 'next/server'
import { performanceTracker } from '@/lib/monitoring/performance-tracker'
import { createClient } from '@supabase/supabase-js'

/**
 * Get performance dashboard data
 * GET /api/monitoring/performance?appIdentifier=<app>&hours=<hours>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { searchParams } = new URL(request.url)
    const appIdentifier = searchParams.get('appIdentifier')
    const hours = parseInt(searchParams.get('hours') || '24')
    const type = searchParams.get('type') || 'dashboard' // dashboard, snapshot, trends, alerts
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    if (!appIdentifier) {
      return NextResponse.json(
        { error: 'appIdentifier parameter is required' },
        { status: 400 }
      )
    }

    // Validate hours parameter
    if (hours < 1 || hours > 168) { // Max 1 week
      return NextResponse.json(
        { error: 'Hours parameter must be between 1 and 168' },
        { status: 400 }
      )
    }

    let responseData: any

    switch (type) {
      case 'snapshot':
        responseData = await performanceTracker.getPerformanceSnapshot(
          user.id, 
          appIdentifier, 
          hours
        )
        break

      case 'trends':
        const metricType = searchParams.get('metricType') || 'response_time'
        responseData = await performanceTracker.getPerformanceTrends(
          user.id,
          appIdentifier,
          metricType,
          hours
        )
        break

      case 'alerts':
        responseData = await performanceTracker.checkPerformanceAlerts(
          user.id,
          appIdentifier
        )
        break

      case 'dashboard':
      default:
        responseData = await performanceTracker.getPerformanceDashboard(
          user.id,
          appIdentifier,
          hours
        )
        break
    }

    return NextResponse.json({
      success: true,
      appIdentifier,
      timeWindow: `${hours} hours`,
      type,
      data: responseData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching performance data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Track custom performance metric
 * POST /api/monitoring/performance
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const {
      appIdentifier,
      metricType,
      value,
      metadata
    } = await request.json()

    // Validate request
    if (!appIdentifier || !metricType || typeof value !== 'number') {
      return NextResponse.json(
        { error: 'appIdentifier, metricType, and numeric value are required' },
        { status: 400 }
      )
    }

    // Validate metric type
    const allowedMetricTypes = [
      'response_time',
      'token_usage',
      'quality_score',
      'custom_latency',
      'custom_accuracy',
      'custom_cost',
      'custom_satisfaction'
    ]

    if (!allowedMetricTypes.includes(metricType) && !metricType.startsWith('custom_')) {
      return NextResponse.json(
        { error: `Invalid metricType. Allowed types: ${allowedMetricTypes.join(', ')} or custom_*` },
        { status: 400 }
      )
    }

    // Track the custom metric
    await performanceTracker.trackCustomMetric(
      user.id,
      appIdentifier,
      metricType,
      value,
      metadata
    )

    return NextResponse.json({
      success: true,
      message: 'Custom metric tracked successfully',
      metric: {
        appIdentifier,
        metricType,
        value,
        metadata,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error tracking custom metric:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to track custom metric',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get performance metrics export
 * PUT /api/monitoring/performance (for export functionality)
 */
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Authenticate user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const {
      appIdentifier,
      startDate,
      endDate,
      metricTypes = [],
      format = 'json'
    } = await request.json()

    if (!appIdentifier || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'appIdentifier, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 30) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 30 days' },
        { status: 400 }
      )
    }

    // Get metrics from database
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = serviceSupabase
      .from('performance_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('app_identifier', appIdentifier)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: true })

    if (metricTypes.length > 0) {
      query = query.in('metric_type', metricTypes)
    }

    const { data: metrics, error } = await query

    if (error) {
      throw new Error(`Failed to export metrics: ${error.message}`)
    }

    const exportData = {
      appIdentifier,
      dateRange: {
        start: startDate,
        end: endDate
      },
      totalRecords: metrics?.length || 0,
      metrics: metrics || [],
      exportedAt: new Date().toISOString()
    }

    if (format === 'csv') {
      // Convert to CSV format
      const headers = ['timestamp', 'metric_type', 'metric_value', 'metadata']
      const csvRows = [
        headers.join(','),
        ...(metrics || []).map(m => [
          m.timestamp,
          m.metric_type,
          m.metric_value,
          JSON.stringify(m.metadata || {}).replace(/,/g, ';')
        ].join(','))
      ]

      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance-metrics-${appIdentifier}-${start.toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      success: true,
      export: exportData
    })

  } catch (error) {
    console.error('Error exporting performance metrics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to export performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}